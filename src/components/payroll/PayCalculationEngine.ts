/**
 * UK Payroll Calculation Engine 2025/26
 * Calculates PAYE income tax, NI, student loans, pension, statutory pay
 */

// ── 2025/26 Tax Thresholds ──────────────────────
const PERSONAL_ALLOWANCE = 1257000; // £12,570 in pence
const BASIC_RATE_LIMIT   = 5027000; // £50,270
const HIGHER_RATE_LIMIT  = 12507000; // £125,070 (PA tapers to 0)
const PA_TAPER_THRESHOLD = 10000000; // £100,000

const BASIC_RATE  = 0.20;
const HIGHER_RATE = 0.40;
const ADDITIONAL_RATE = 0.45;

// ── NI Thresholds (Annual, Cat A) ──────────────
const NI_PRIMARY_THRESHOLD   = 1204800; // £12,048
const NI_UPPER_EARNINGS      = 5027200; // £50,272
const NI_EMPLOYEE_MAIN_RATE  = 0.08;
const NI_EMPLOYEE_UPPER_RATE = 0.02;
const NI_EMPLOYER_THRESHOLD  = 517500;  // £5,175
const NI_EMPLOYER_RATE       = 0.138;   // 13.8%

// ── Student Loan Thresholds (Annual) ───────────
const STUDENT_LOAN: Record<string, { threshold: number; rate: number }> = {
  plan_1: { threshold: 2449500, rate: 0.09 },
  plan_2: { threshold: 2729500, rate: 0.09 },
  plan_4: { threshold: 3139500, rate: 0.09 },
  plan_5: { threshold: 2500000, rate: 0.09 },
  postgrad: { threshold: 2100000, rate: 0.06 },
};

// ── Statutory Pay Rates ────────────────────────
const SSP_WEEKLY_PENCE = 11649; // £116.75 (2025/26)
const SMP_RATE_PENCE = 18727; // £187.18 or 90% of average weekly earnings (first 6 weeks at 90%, then flat)
const SPP_WEEKLY_PENCE = 18727;
const SAP_WEEKLY_PENCE = 18727;
const SHPP_WEEKLY_PENCE = 18727;

export type PayFrequency = "weekly" | "fortnightly" | "four_weekly" | "monthly";

const periodsPerYear: Record<PayFrequency, number> = {
  weekly: 52,
  fortnightly: 26,
  four_weekly: 13,
  monthly: 12,
};

export interface PayCalcInput {
  annualSalaryPence: number;
  hourlyRatePence?: number;
  hoursWorked?: number;
  overtimeHours?: number;
  overtimeRatePence?: number;
  frequency: PayFrequency;
  taxCode: string;
  niCategory: string;
  isDirector?: boolean;
  directorsNicMethod?: "annual" | "cumulative";
  studentLoanPlan?: string;
  postgradLoan?: boolean;
  pensionEmployeePct: number;
  pensionEmployerPct: number;
  pensionOptOut?: boolean;
  week1Month1?: boolean;
  // Absences in period
  holidayDays?: number;
  sickDays?: number;
  smpWeeks?: number;
  sppWeeks?: number;
  sapWeeks?: number;
  shppWeeks?: number;
  // YTD (for cumulative calculation)
  ytdGrossPence?: number;
  ytdTaxPence?: number;
  ytdNiPence?: number;
  currentPeriod?: number; // which period in the year (1-12 or 1-52)
  // Additional pay items
  bonusPence?: number;
  commissionPence?: number;
  // Deductions
  attachmentOfEarningsPence?: number;
}

export interface PayCalcResult {
  grossPence: number;
  basicPayPence: number;
  overtimePence: number;
  holidayPayPence: number;
  sickPayPence: number;
  smpPence: number;
  sppPence: number;
  sapPence: number;
  shppPence: number;
  bonusPence: number;
  commissionPence: number;
  taxPence: number;
  niEmployeePence: number;
  niEmployerPence: number;
  studentLoanPence: number;
  postgradLoanPence: number;
  pensionEmployeePence: number;
  pensionEmployerPence: number;
  attachmentOfEarningsPence: number;
  netPence: number;
  // Breakdown for payslip
  taxablePayPence: number;
  personalAllowancePence: number;
}

function parseTaxCode(code: string): { allowancePence: number; isScottish: boolean; isWelsh: boolean; isBR: boolean; isD0: boolean; isD1: boolean; isNT: boolean; isK: boolean } {
  const upper = (code || "1257L").toUpperCase().trim();
  
  if (upper === "BR") return { allowancePence: 0, isScottish: false, isWelsh: false, isBR: true, isD0: false, isD1: false, isNT: false, isK: false };
  if (upper === "D0") return { allowancePence: 0, isScottish: false, isWelsh: false, isBR: false, isD0: true, isD1: false, isNT: false, isK: false };
  if (upper === "D1") return { allowancePence: 0, isScottish: false, isWelsh: false, isBR: false, isD0: false, isD1: true, isNT: false, isK: false };
  if (upper === "NT") return { allowancePence: 0, isScottish: false, isWelsh: false, isBR: false, isD0: false, isD1: false, isNT: true, isK: false };
  
  const isScottish = upper.startsWith("S");
  const isWelsh = upper.startsWith("C");
  const isK = upper.includes("K");
  
  // Extract numeric part
  const numMatch = upper.match(/(\d+)/);
  const num = numMatch ? parseInt(numMatch[1]) : 1257;
  const allowancePence = num * 1000; // tax code 1257 = £12,570 = 1257000 pence
  
  return { allowancePence: isK ? -allowancePence : allowancePence, isScottish, isWelsh, isBR: false, isD0: false, isD1: false, isNT: false, isK };
}

export function calculatePay(input: PayCalcInput): PayCalcResult {
  const periods = periodsPerYear[input.frequency];
  const period = input.currentPeriod || 1;
  
  // ── Gross Pay ──────────────────────
  let basicPayPence: number;
  if (input.hourlyRatePence && input.hoursWorked) {
    basicPayPence = Math.round(input.hourlyRatePence * input.hoursWorked);
  } else {
    basicPayPence = Math.round(input.annualSalaryPence / periods);
  }
  
  const overtimePence = Math.round((input.overtimeHours || 0) * (input.overtimeRatePence || (input.hourlyRatePence || 0) * 1.5));
  
  // Holiday pay (1/260 of annual salary per day for monthly employees)
  const dailyRate = Math.round(input.annualSalaryPence / (input.frequency === "weekly" ? 260 : 260));
  const holidayPayPence = Math.round((input.holidayDays || 0) * dailyRate);
  
  // Statutory pay
  const weeklyEquiv = input.frequency === "weekly" ? 1 : input.frequency === "fortnightly" ? 2 : input.frequency === "four_weekly" ? 4 : 4.333;
  const sickPayPence = Math.round((input.sickDays || 0) / 5 * SSP_WEEKLY_PENCE); // SSP per qualifying week
  const smpPence = Math.round((input.smpWeeks || 0) * SMP_RATE_PENCE);
  const sppPence = Math.round((input.sppWeeks || 0) * SPP_WEEKLY_PENCE);
  const sapPence = Math.round((input.sapWeeks || 0) * SAP_WEEKLY_PENCE);
  const shppPence = Math.round((input.shppWeeks || 0) * SHPP_WEEKLY_PENCE);
  
  const bonusPence = input.bonusPence || 0;
  const commissionPence = input.commissionPence || 0;
  
  const grossPence = basicPayPence + overtimePence + holidayPayPence + sickPayPence + smpPence + sppPence + sapPence + shppPence + bonusPence + commissionPence;
  
  // ── Income Tax ─────────────────────
  const tc = parseTaxCode(input.taxCode);
  let taxPence = 0;
  
  if (tc.isNT) {
    taxPence = 0;
  } else if (tc.isBR) {
    taxPence = Math.round(grossPence * BASIC_RATE);
  } else if (tc.isD0) {
    taxPence = Math.round(grossPence * HIGHER_RATE);
  } else if (tc.isD1) {
    taxPence = Math.round(grossPence * ADDITIONAL_RATE);
  } else if (input.week1Month1) {
    // Non-cumulative: calculate on this period only
    const periodAllowance = Math.round(tc.allowancePence / periods);
    const taxable = Math.max(0, grossPence - periodAllowance);
    const periodBasicLimit = Math.round((BASIC_RATE_LIMIT - PERSONAL_ALLOWANCE) / periods);
    const periodHigherLimit = Math.round((HIGHER_RATE_LIMIT - PERSONAL_ALLOWANCE) / periods);
    
    if (taxable <= periodBasicLimit) {
      taxPence = Math.round(taxable * BASIC_RATE);
    } else if (taxable <= periodHigherLimit) {
      taxPence = Math.round(periodBasicLimit * BASIC_RATE + (taxable - periodBasicLimit) * HIGHER_RATE);
    } else {
      taxPence = Math.round(periodBasicLimit * BASIC_RATE + (periodHigherLimit - periodBasicLimit) * HIGHER_RATE + (taxable - periodHigherLimit) * ADDITIONAL_RATE);
    }
  } else {
    // Cumulative calculation
    const cumulativeAllowance = Math.round(tc.allowancePence * period / periods);
    const cumulativeGross = (input.ytdGrossPence || 0) + grossPence;
    const taxable = Math.max(0, cumulativeGross - cumulativeAllowance);
    
    const cumulativeBasicLimit = Math.round((BASIC_RATE_LIMIT - tc.allowancePence) * period / periods);
    const cumulativeHigherLimit = Math.round((HIGHER_RATE_LIMIT - tc.allowancePence) * period / periods);
    
    let cumulativeTax: number;
    if (taxable <= cumulativeBasicLimit) {
      cumulativeTax = Math.round(taxable * BASIC_RATE);
    } else if (taxable <= cumulativeHigherLimit) {
      cumulativeTax = Math.round(cumulativeBasicLimit * BASIC_RATE + (taxable - cumulativeBasicLimit) * HIGHER_RATE);
    } else {
      cumulativeTax = Math.round(cumulativeBasicLimit * BASIC_RATE + (cumulativeHigherLimit - cumulativeBasicLimit) * HIGHER_RATE + (taxable - cumulativeHigherLimit) * ADDITIONAL_RATE);
    }
    
    taxPence = Math.max(0, cumulativeTax - (input.ytdTaxPence || 0));
  }
  
  // ── National Insurance ─────────────
  const periodPT = Math.round(NI_PRIMARY_THRESHOLD / periods);
  const periodUEL = Math.round(NI_UPPER_EARNINGS / periods);
  const periodET = Math.round(NI_EMPLOYER_THRESHOLD / periods);
  
  let niEmployeePence = 0;
  if (grossPence > periodPT) {
    const bandedEarnings = Math.min(grossPence, periodUEL) - periodPT;
    niEmployeePence = Math.round(Math.max(0, bandedEarnings) * NI_EMPLOYEE_MAIN_RATE);
    if (grossPence > periodUEL) {
      niEmployeePence += Math.round((grossPence - periodUEL) * NI_EMPLOYEE_UPPER_RATE);
    }
  }
  
  let niEmployerPence = 0;
  if (grossPence > periodET) {
    niEmployerPence = Math.round((grossPence - periodET) * NI_EMPLOYER_RATE);
  }
  
  // ── Student Loans ──────────────────
  let studentLoanPence = 0;
  if (input.studentLoanPlan && STUDENT_LOAN[input.studentLoanPlan]) {
    const sl = STUDENT_LOAN[input.studentLoanPlan];
    const periodThreshold = Math.round(sl.threshold / periods);
    if (grossPence > periodThreshold) {
      studentLoanPence = Math.round((grossPence - periodThreshold) * sl.rate);
    }
  }
  
  let postgradLoanPence = 0;
  if (input.postgradLoan) {
    const pg = STUDENT_LOAN.postgrad;
    const periodThreshold = Math.round(pg.threshold / periods);
    if (grossPence > periodThreshold) {
      postgradLoanPence = Math.round((grossPence - periodThreshold) * pg.rate);
    }
  }
  
  // ── Pension ────────────────────────
  let pensionEmployeePence = 0;
  let pensionEmployerPence = 0;
  if (!input.pensionOptOut) {
    pensionEmployeePence = Math.round(grossPence * (input.pensionEmployeePct / 100));
    pensionEmployerPence = Math.round(grossPence * (input.pensionEmployerPct / 100));
  }
  
  // ── Attachment of Earnings ─────────
  const attachmentOfEarningsPence = input.attachmentOfEarningsPence || 0;
  
  // ── Net Pay ────────────────────────
  const netPence = grossPence - taxPence - niEmployeePence - studentLoanPence - postgradLoanPence - pensionEmployeePence - attachmentOfEarningsPence;
  
  return {
    grossPence,
    basicPayPence,
    overtimePence,
    holidayPayPence,
    sickPayPence,
    smpPence,
    sppPence,
    sapPence,
    shppPence,
    bonusPence,
    commissionPence,
    taxPence,
    niEmployeePence,
    niEmployerPence,
    studentLoanPence,
    postgradLoanPence,
    pensionEmployeePence,
    pensionEmployerPence,
    attachmentOfEarningsPence,
    netPence,
    taxablePayPence: Math.max(0, grossPence - Math.round(tc.allowancePence / periods)),
    personalAllowancePence: Math.round(tc.allowancePence / periods),
  };
}

export { SSP_WEEKLY_PENCE, SMP_RATE_PENCE, SPP_WEEKLY_PENCE, SAP_WEEKLY_PENCE, SHPP_WEEKLY_PENCE };

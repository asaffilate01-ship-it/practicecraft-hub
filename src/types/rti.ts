/**
 * RTI (Real Time Information) types for HMRC payroll submissions.
 * FPS = Full Payment Submission, EPS = Employer Payment Summary.
 */

export type RtiFpsLine = {
  employeeId: string;
  employeeName: string;
  niNumber: string;
  taxCode: string;
  grossPay: number;
  tax: number;
  ni: number;
  ytdGross: number;
  ytdTax: number;
};

export type RtiFpsDraft = {
  employerId: string;
  payrunId: string;
  period: string;       // e.g. "2026-02" or tax period number
  paymentDate: string;  // YYYY-MM-DD
  lines: RtiFpsLine[];
  status: "draft" | "queued" | "submitted" | "accepted" | "rejected" | "error";
};

export type RtiEpsDraft = {
  employerId: string;
  period: string;
  noPaymentsToEmployees: boolean;
  reclaim: {
    nicComp: number;
    cisSuffered: number;
    smpRecovered: number;
    sppRecovered: number;
    sapRecovered: number;
    shppRecovered: number;
  };
  status: "draft" | "queued" | "submitted" | "accepted" | "rejected";
};

export type RtiFpsPayload = {
  employer: {
    payeRef: string;
    accountsOfficeRef: string;
    senderId: string;
    mode: "test" | "live";
  };
  submission: {
    correlationId: string;
    paymentDate: string;
    period: string;
  };
  employees: Array<{
    name: string;
    niNumber: string;
    taxCode: string;
    pay: { gross: number; tax: number; ni: number };
    ytd: { gross: number; tax: number };
  }>;
};

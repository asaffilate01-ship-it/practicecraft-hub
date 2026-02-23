/**
 * Shared domain types aligned to JSON Schema payload definitions.
 * Used across frontend forms, API calls, and query results.
 */

// ── Primitives ──────────────────────────────────────────────

/** ISO 8601 date string (YYYY-MM-DD) */
export type ISODate = string;

/** ISO 8601 datetime string */
export type ISODateTime = string;

// ── Address & Person ────────────────────────────────────────

export type Address = {
  addressLine1: string;
  addressLine2?: string;
  addressLine3?: string;
  postTown: string;
  county?: string;
  postcode?: string;
  country: string;
};

export type PersonName = {
  title?: string;
  forename: string;
  middleNames?: string;
  surname: string;
};

// ── Secretarial ─────────────────────────────────────────────

export type ChangeType =
  | "CONFIRMATION_STATEMENT"
  | "CHANGE_REGISTERED_OFFICE"
  | "CHANGE_SAIL_ADDRESS"
  | "APPOINT_DIRECTOR"
  | "RESIGN_DIRECTOR"
  | "APPOINT_SECRETARY"
  | "RESIGN_SECRETARY"
  | "PSC_CHANGE"
  | "SIC_CHANGE"
  | "ALLOT_SHARES"
  | "TRANSFER_SHARES"
  | "OTHER";

export type ChangeStatus =
  | "draft"
  | "in_review"
  | "awaiting_client"
  | "approved"
  | "ready_to_file"
  | "queued"
  | "sent"
  | "accepted"
  | "rejected";

export type ConfirmationStatementPayload = {
  statementDate: ISODate;
  confirmations: {
    officersConfirmed: boolean;
    pscConfirmed: boolean;
    registeredOfficeConfirmed: boolean;
    sicConfirmed: boolean;
    shareCapitalConfirmed: boolean;
  };
  presenterReference?: string;
  notes?: string;
};

export type ChangeRegisteredOfficePayload = {
  effectiveDate: ISODate;
  newRegisteredOfficeAddress: Address;
  notes?: string;
};

export type AppointDirectorPayload = {
  appointmentDate: ISODate;
  person: {
    name: PersonName;
    dateOfBirth: ISODate;
    nationality: string;
    occupation: string;
    serviceAddress: Address;
    residentialAddress?: Address;
    email?: string;
  };
  consentToActDocumentId?: string;
  notes?: string;
};

export type ResignDirectorPayload = {
  directorId: string;
  resignationDate: ISODate;
  notes?: string;
};

export type PscChangePayload = {
  action: "add" | "update" | "cease";
  psc: {
    pscId?: string;
    pscType: "individual" | "corporate" | "legalPerson";
    name: string;
    dateOfBirth?: ISODate;
    nationality?: string;
    serviceAddress?: Address;
    naturesOfControl: string[];
    notifiedOn: ISODate;
    ceasedOn?: ISODate;
    identityVerified?: boolean;
    personalCodeProvided?: boolean;
  };
  supportingDocumentIds?: string[];
  notes?: string;
};

export type SicChangePayload = {
  effectiveDate: ISODate;
  sicCodes: string[];
  notes?: string;
};

export type AllotSharesPayload = {
  allotmentDate: ISODate;
  shareClassId: string;
  allotments: Array<{
    toMemberId: string;
    quantity: number;
    considerationPence?: number;
    shareCertificateDocumentId?: string;
  }>;
  resolutionDocumentId?: string;
  notes?: string;
};

export type TransferSharesPayload = {
  transferDate: ISODate;
  shareClassId: string;
  fromMemberId: string;
  toMemberId: string;
  quantity: number;
  considerationPence?: number;
  stockTransferFormDocumentId?: string;
  notes?: string;
};

export type SecretarialPayload =
  | ConfirmationStatementPayload
  | ChangeRegisteredOfficePayload
  | AppointDirectorPayload
  | ResignDirectorPayload
  | PscChangePayload
  | SicChangePayload
  | AllotSharesPayload
  | TransferSharesPayload
  | Record<string, unknown>;

// ── Secretarial Change Record ───────────────────────────────

export type SecretarialChange = {
  id: string;
  clientId: string;
  tenantId: string;
  changeType: ChangeType;
  title: string;
  description?: string;
  status: ChangeStatus;
  payload: SecretarialPayload;
  validationJson?: ValidationResult;
  requiresAuthCode: boolean;
  assignedUserId?: string;
  approvedByUserId?: string;
  approvedAt?: ISODateTime;
  submissionJobId?: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
};

// ── Validation ──────────────────────────────────────────────

export type ValidationIssue = {
  path: string;
  code: string;
  message: string;
};

export type ValidationResult = {
  ok: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
};

// ── Submission Job ──────────────────────────────────────────

export type SubmissionJobStatus =
  | "queued"
  | "sent"
  | "accepted"
  | "rejected"
  | "failed"
  | "cancelled";

export type SubmissionJob = {
  id: string;
  tenantId: string;
  clientId?: string;
  provider: "companies_house" | "hmrc_vat" | "hmrc_rti" | string;
  jobType: string;
  status: SubmissionJobStatus;
  correlationId?: string;
  idempotencyKey?: string;
  attempts: number;
  lastAttemptAt?: ISODateTime;
  responseJson?: Record<string, unknown>;
  errorMessage?: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
};

// ── Incorporation ───────────────────────────────────────────

export type IncorporationStatus =
  | "draft"
  | "people_added"
  | "shares_set"
  | "kyc_pending"
  | "kyc_approved"
  | "payment_pending"
  | "payment_paid"
  | "ready_to_submit"
  | "submitted"
  | "accepted"
  | "rejected";

export type IncorporationApplication = {
  id: string;
  tenantId: string;
  proposedName?: string;
  sicCodes: string[];
  entityType: string;
  status: IncorporationStatus;
  registeredOfficeJson: Address;
  sailAddressJson?: Address;
  dataJson: Record<string, unknown>;
  paymentStatus: string;
  paymentAmountPence?: number;
  chCompanyNumber?: string;
  chIncorporationDate?: ISODate;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
};

// ── Portal ──────────────────────────────────────────────────

export type AuthAudience = "staff" | "client" | "employee" | "mobile";

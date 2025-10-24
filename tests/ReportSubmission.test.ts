/** @format */

// ReportSubmission.test.ts

import { describe, it, expect, beforeEach } from "vitest";
import { stringUtf8CV, uintCV, bufferCV } from "@stacks/transactions";

const ERR_NOT_AUTHORIZED = 100;
const ERR_INVALID_DRUG_ID = 101;
const ERR_INVALID_SEVERITY = 102;
const ERR_INVALID_DESCRIPTION = 103;
const ERR_INVALID_HASH = 104;
const ERR_REPORT_ALREADY_EXISTS = 106;
const ERR_REPORT_NOT_FOUND = 107;
const ERR_INVALID_LOCATION = 110;
const ERR_AUTHORITY_NOT_SET = 111;
const ERR_INVALID_REPORT_COUNT = 115;
const ERR_INVALID_ANONYMOUS_ID = 114;
const ERR_INVALID_METADATA = 113;

interface Report {
  drugId: number;
  anonymousId: Buffer;
  description: string;
  severity: number;
  timestamp: number;
  submitter: string;
  location: string;
  status: string;
  evidenceHash: Buffer;
  metadata: string;
}

interface ReportUpdate {
  updateDescription: string;
  updateSeverity: number;
  updateTimestamp: number;
  updater: string;
}

interface Result<T> {
  ok: boolean;
  value: T;
}

class ReportSubmissionMock {
  state: {
    nextReportId: number;
    maxReports: number;
    submissionFee: number;
    authorityContract: string | null;
    reports: Map<number, Report>;
    reportUpdates: Map<number, ReportUpdate>;
    reportsByHash: Map<string, number>;
  } = {
    nextReportId: 0,
    maxReports: 1000000,
    submissionFee: 500,
    authorityContract: null,
    reports: new Map(),
    reportUpdates: new Map(),
    reportsByHash: new Map(),
  };
  blockHeight: number = 0;
  caller: string = "ST1TEST";
  authorities: Set<string> = new Set(["ST1TEST"]);
  stxTransfers: Array<{ amount: number; from: string; to: string | null }> = [];

  reset() {
    this.state = {
      nextReportId: 0,
      maxReports: 1000000,
      submissionFee: 500,
      authorityContract: null,
      reports: new Map(),
      reportUpdates: new Map(),
      reportsByHash: new Map(),
    };
    this.blockHeight = 0;
    this.caller = "ST1TEST";
    this.authorities = new Set(["ST1TEST"]);
    this.stxTransfers = [];
  }

  isVerifiedAuthority(principal: string): Result<boolean> {
    return { ok: true, value: this.authorities.has(principal) };
  }

  setAuthorityContract(contractPrincipal: string): Result<boolean> {
    if (contractPrincipal === "SP000000000000000000002Q6VF78") {
      return { ok: false, value: false };
    }
    if (this.state.authorityContract !== null) {
      return { ok: false, value: false };
    }
    this.state.authorityContract = contractPrincipal;
    return { ok: true, value: true };
  }

  setSubmissionFee(newFee: number): Result<boolean> {
    if (!this.state.authorityContract) return { ok: false, value: false };
    this.state.submissionFee = newFee;
    return { ok: true, value: true };
  }

  submitReport(
    drugId: number,
    anonymousId: Buffer,
    description: string,
    severity: number,
    location: string,
    evidenceHash: Buffer,
    metadata: string
  ): Result<number> {
    if (this.state.nextReportId >= this.state.maxReports)
      return { ok: false, value: ERR_INVALID_REPORT_COUNT };
    if (drugId <= 0) return { ok: false, value: ERR_INVALID_DRUG_ID };
    if (anonymousId.length === 0)
      return { ok: false, value: ERR_INVALID_ANONYMOUS_ID };
    if (!description || description.length > 500)
      return { ok: false, value: ERR_INVALID_DESCRIPTION };
    if (severity < 1 || severity > 5)
      return { ok: false, value: ERR_INVALID_SEVERITY };
    if (!location || location.length > 100)
      return { ok: false, value: ERR_INVALID_LOCATION };
    if (evidenceHash.length === 0)
      return { ok: false, value: ERR_INVALID_HASH };
    if (metadata.length > 200)
      return { ok: false, value: ERR_INVALID_METADATA };
    if (!this.isVerifiedAuthority(this.caller).value)
      return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (this.state.reportsByHash.has(evidenceHash.toString("hex")))
      return { ok: false, value: ERR_REPORT_ALREADY_EXISTS };
    if (!this.state.authorityContract)
      return { ok: false, value: ERR_AUTHORITY_NOT_SET };

    this.stxTransfers.push({
      amount: this.state.submissionFee,
      from: this.caller,
      to: this.state.authorityContract,
    });

    const id = this.state.nextReportId;
    const report: Report = {
      drugId,
      anonymousId,
      description,
      severity,
      timestamp: this.blockHeight,
      submitter: this.caller,
      location,
      status: "pending",
      evidenceHash,
      metadata,
    };
    this.state.reports.set(id, report);
    this.state.reportsByHash.set(evidenceHash.toString("hex"), id);
    this.state.nextReportId++;
    return { ok: true, value: id };
  }

  updateReport(
    id: number,
    updateDescription: string,
    updateSeverity: number
  ): Result<boolean> {
    const report = this.state.reports.get(id);
    if (!report) return { ok: false, value: false };
    if (report.submitter !== this.caller) return { ok: false, value: false };
    if (!updateDescription || updateDescription.length > 500)
      return { ok: false, value: false };
    if (updateSeverity < 1 || updateSeverity > 5)
      return { ok: false, value: false };

    const updated: Report = {
      ...report,
      description: updateDescription,
      severity: updateSeverity,
      timestamp: this.blockHeight,
    };
    this.state.reports.set(id, updated);
    this.state.reportUpdates.set(id, {
      updateDescription,
      updateSeverity,
      updateTimestamp: this.blockHeight,
      updater: this.caller,
    });
    return { ok: true, value: true };
  }

  getReport(id: number): Report | null {
    return this.state.reports.get(id) || null;
  }

  getReportCount(): Result<number> {
    return { ok: true, value: this.state.nextReportId };
  }

  isReportRegistered(hash: Buffer): Result<boolean> {
    return {
      ok: true,
      value: this.state.reportsByHash.has(hash.toString("hex")),
    };
  }
}

describe("ReportSubmission", () => {
  let contract: ReportSubmissionMock;

  beforeEach(() => {
    contract = new ReportSubmissionMock();
    contract.reset();
  });

  it("submits a report successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const anonymousId = Buffer.from("a".repeat(32));
    const evidenceHash = Buffer.from("b".repeat(32));
    const result = contract.submitReport(
      1,
      anonymousId,
      "Headache",
      3,
      "New York",
      evidenceHash,
      "Age: 30"
    );
    expect(result.ok).toBe(true);
    expect(result.value).toBe(0);

    const report = contract.getReport(0);
    expect(report?.drugId).toBe(1);
    expect(report?.anonymousId).toEqual(anonymousId);
    expect(report?.description).toBe("Headache");
    expect(report?.severity).toBe(3);
    expect(report?.location).toBe("New York");
    expect(report?.status).toBe("pending");
    expect(report?.evidenceHash).toEqual(evidenceHash);
    expect(report?.metadata).toBe("Age: 30");
    expect(contract.stxTransfers).toEqual([
      { amount: 500, from: "ST1TEST", to: "ST2TEST" },
    ]);
  });

  it("rejects duplicate evidence hash", () => {
    contract.setAuthorityContract("ST2TEST");
    const anonymousId = Buffer.from("a".repeat(32));
    const evidenceHash = Buffer.from("b".repeat(32));
    contract.submitReport(
      1,
      anonymousId,
      "Headache",
      3,
      "New York",
      evidenceHash,
      "Age: 30"
    );
    const result = contract.submitReport(
      2,
      anonymousId,
      "Nausea",
      4,
      "London",
      evidenceHash,
      "Age: 40"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_REPORT_ALREADY_EXISTS);
  });

  it("rejects non-authorized caller", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.caller = "ST2FAKE";
    contract.authorities = new Set();
    const anonymousId = Buffer.from("a".repeat(32));
    const evidenceHash = Buffer.from("b".repeat(32));
    const result = contract.submitReport(
      1,
      anonymousId,
      "Headache",
      3,
      "New York",
      evidenceHash,
      "Age: 30"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });

  it("rejects submission without authority contract", () => {
    const anonymousId = Buffer.from("a".repeat(32));
    const evidenceHash = Buffer.from("b".repeat(32));
    const result = contract.submitReport(
      1,
      anonymousId,
      "Headache",
      3,
      "New York",
      evidenceHash,
      "Age: 30"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_AUTHORITY_NOT_SET);
  });

  it("rejects invalid drug ID", () => {
    contract.setAuthorityContract("ST2TEST");
    const anonymousId = Buffer.from("a".repeat(32));
    const evidenceHash = Buffer.from("b".repeat(32));
    const result = contract.submitReport(
      0,
      anonymousId,
      "Headache",
      3,
      "New York",
      evidenceHash,
      "Age: 30"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_DRUG_ID);
  });

  it("rejects invalid severity", () => {
    contract.setAuthorityContract("ST2TEST");
    const anonymousId = Buffer.from("a".repeat(32));
    const evidenceHash = Buffer.from("b".repeat(32));
    const result = contract.submitReport(
      1,
      anonymousId,
      "Headache",
      6,
      "New York",
      evidenceHash,
      "Age: 30"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_SEVERITY);
  });

  it("rejects invalid description", () => {
    contract.setAuthorityContract("ST2TEST");
    const anonymousId = Buffer.from("a".repeat(32));
    const evidenceHash = Buffer.from("b".repeat(32));
    const result = contract.submitReport(
      1,
      anonymousId,
      "",
      3,
      "New York",
      evidenceHash,
      "Age: 30"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_DESCRIPTION);
  });

  it("rejects invalid evidence hash", () => {
    contract.setAuthorityContract("ST2TEST");
    const anonymousId = Buffer.from("a".repeat(32));
    const evidenceHash = Buffer.from("");
    const result = contract.submitReport(
      1,
      anonymousId,
      "Headache",
      3,
      "New York",
      evidenceHash,
      "Age: 30"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_HASH);
  });

  it("updates a report successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const anonymousId = Buffer.from("a".repeat(32));
    const evidenceHash = Buffer.from("b".repeat(32));
    contract.submitReport(
      1,
      anonymousId,
      "Headache",
      3,
      "New York",
      evidenceHash,
      "Age: 30"
    );
    const result = contract.updateReport(0, "Nausea", 4);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const report = contract.getReport(0);
    expect(report?.description).toBe("Nausea");
    expect(report?.severity).toBe(4);
    const update = contract.state.reportUpdates.get(0);
    expect(update?.updateDescription).toBe("Nausea");
    expect(update?.updateSeverity).toBe(4);
    expect(update?.updater).toBe("ST1TEST");
  });

  it("rejects update for non-existent report", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.updateReport(99, "Nausea", 4);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("rejects update by non-submitter", () => {
    contract.setAuthorityContract("ST2TEST");
    const anonymousId = Buffer.from("a".repeat(32));
    const evidenceHash = Buffer.from("b".repeat(32));
    contract.submitReport(
      1,
      anonymousId,
      "Headache",
      3,
      "New York",
      evidenceHash,
      "Age: 30"
    );
    contract.caller = "ST3FAKE";
    const result = contract.updateReport(0, "Nausea", 4);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("sets submission fee successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.setSubmissionFee(1000);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.submissionFee).toBe(1000);
    const anonymousId = Buffer.from("a".repeat(32));
    const evidenceHash = Buffer.from("b".repeat(32));
    contract.submitReport(
      1,
      anonymousId,
      "Headache",
      3,
      "New York",
      evidenceHash,
      "Age: 30"
    );
    expect(contract.stxTransfers).toEqual([
      { amount: 1000, from: "ST1TEST", to: "ST2TEST" },
    ]);
  });

  it("returns correct report count", () => {
    contract.setAuthorityContract("ST2TEST");
    const anonymousId = Buffer.from("a".repeat(32));
    const evidenceHash1 = Buffer.from("b".repeat(32));
    const evidenceHash2 = Buffer.from("c".repeat(32));
    contract.submitReport(
      1,
      anonymousId,
      "Headache",
      3,
      "New York",
      evidenceHash1,
      "Age: 30"
    );
    contract.submitReport(
      2,
      anonymousId,
      "Nausea",
      4,
      "London",
      evidenceHash2,
      "Age: 40"
    );
    const result = contract.getReportCount();
    expect(result.ok).toBe(true);
    expect(result.value).toBe(2);
  });

  it("checks report existence correctly", () => {
    contract.setAuthorityContract("ST2TEST");
    const anonymousId = Buffer.from("a".repeat(32));
    const evidenceHash = Buffer.from("b".repeat(32));
    contract.submitReport(
      1,
      anonymousId,
      "Headache",
      3,
      "New York",
      evidenceHash,
      "Age: 30"
    );
    const result = contract.isReportRegistered(evidenceHash);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const result2 = contract.isReportRegistered(Buffer.from("c".repeat(32)));
    expect(result2.ok).toBe(true);
    expect(result2.value).toBe(false);
  });
});

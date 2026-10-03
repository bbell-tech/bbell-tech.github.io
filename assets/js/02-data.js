/* ================= Shared fictional data: Larkspur Supply Co. ================= */
const CO = { name: "Larkspur Supply Co.", short: "Larkspur", size: "about 600 employees in 9 states" };
const HANDBOOK = [
  { id: "H1", title: "PTO accrual", text: "Full-time employees accrue 4.62 hours of paid time off (PTO) every biweekly pay period, which is 120 hours a year. Part-time employees accrue PTO in proportion to their scheduled hours. Accrual starts on the first day of employment." },
  { id: "H2", title: "PTO carryover", text: "Up to 40 hours of unused PTO carry over into the next calendar year. Hours above 40 are forfeited on January 1, except where state law requires a payout. The HRIS shows a year-end projection on the time-off page." },
  { id: "H3", title: "Requesting time off", text: "Submit PTO requests in the HRIS. Requests for three or more consecutive workdays need at least two weeks' notice. Managers approve or decline within three business days. Shorter notice needs your manager's approval as an exception." },
  { id: "H4", title: "PTO balance rules", text: "PTO balances can't go below zero hours, so you can't borrow time you haven't accrued. Requests that would overdraw your balance are returned to you. You can use unpaid time off with manager approval." },
  { id: "H5", title: "Paid holidays", text: "Larkspur observes nine paid holidays: New Year's Day, Martin Luther King Jr. Day, Memorial Day, Juneteenth, Independence Day, Labor Day, Thanksgiving Day, the day after Thanksgiving, and Christmas Day." },
  { id: "H6", title: "Pay schedule", text: "Employees are paid biweekly on Fridays by direct deposit. When payday falls on a bank holiday, pay is deposited the business day before. Pay stubs are available in the HRIS on payday morning." },
  { id: "H7", title: "Direct deposit changes", text: "Direct deposit changes submitted in the HRIS by noon Wednesday take effect on that week's payday. Changes submitted later take effect the following payday. Payroll will never ask for bank details by email or chat." },
  { id: "H8", title: "Overtime", text: "Non-exempt employees are paid 1.5 times their regular rate for hours worked over 40 in a workweek. The workweek runs Sunday through Saturday. Overtime should be approved by your manager in advance, but all hours worked are paid, approved or not." },
  { id: "H9", title: "Timekeeping and missed punches", text: "Non-exempt employees clock in and out in the timekeeping app. If you miss a punch, submit a correction within two business days. Your manager approves corrections. Unapproved corrections are not included in payroll until they are approved." },
  { id: "H10", title: "Payroll corrections", text: "If you were underpaid by more than $50, Payroll issues an off-cycle payment within three business days of the corrected time being approved. Smaller amounts are added to the next regular paycheck. Report pay errors through a Payroll ticket." },
  { id: "H11", title: "Expense reimbursement", text: "Submit expenses within 30 days with a receipt for anything over $25. Approved expenses are reimbursed on the next regular payday. Personal items and fines aren't reimbursable." },
  { id: "H12", title: "Remote work stipend", text: "Fully remote employees receive a $50 monthly internet stipend and a one-time $300 home office setup allowance. Hybrid employees receive the setup allowance only." },
  { id: "H13", title: "Benefits enrollment", text: "New hires must enroll in benefits within 30 days of their start date. Coverage begins on the first day of the month after the start date. Open enrollment for the next plan year runs during November." },
  { id: "H14", title: "401(k) retirement plan", text: "Employees can contribute to the 401(k) after 60 days of employment. Larkspur matches 100% of the first 4% of pay you contribute. The company match vests over three years: one third after each full year of service." },
  { id: "H15", title: "Family and medical leave", text: "Employees with at least 12 months of service and 1,250 hours worked in the past 12 months may take up to 12 weeks of unpaid, job-protected leave under FMLA. Contact HR at least 30 days ahead when the leave is foreseeable." },
  { id: "H16", title: "Bereavement leave", text: "Employees receive up to three paid days for the death of an immediate family member and one paid day for an extended family member. Talk to your manager and code the time as bereavement in the HRIS." },
  { id: "H17", title: "Jury duty", text: "Larkspur pays regular wages for up to 10 days of jury duty per year. Give your manager a copy of the summons and record the time as jury duty." },
  { id: "H18", title: "Final pay", text: "The timing of a final paycheck follows the law of the state where the employee works. Contact Payroll for the date that applies. Accrued PTO payout at separation also follows state law." },
  { id: "H19", title: "Company equipment", text: "Larkspur provides a laptop and accessories. Return all equipment within 10 business days after your last day. IT sends a prepaid shipping label to remote employees." },
  { id: "H20", title: "Protecting employee data", text: "Never share pay stubs, Social Security numbers, or bank details over chat or email. HR and Payroll will never ask for your password. Report suspicious requests to the Security team through a ticket." }
];
const RAG_TESTS = [
  { q: "How much PTO do I earn each paycheck?", gold: ["H1"] }, { q: "Can I roll over unused vacation into next year?", gold: ["H2"] },
  { q: "How far ahead do I need to ask for a week off?", gold: ["H3"] }, { q: "Can my PTO balance go negative?", gold: ["H4"] },
  { q: "Is the day after Thanksgiving a paid holiday?", gold: ["H5"] }, { q: "When do we get paid if Friday is a holiday?", gold: ["H6"] },
  { q: "I changed my bank account Thursday. When does it apply?", gold: ["H7"] }, { q: "Do I get paid for overtime my manager didn't approve?", gold: ["H8"] },
  { q: "I forgot to clock out yesterday. What do I do?", gold: ["H9"] }, { q: "My check was short $120. How fast is it fixed?", gold: ["H10"] },
  { q: "How long do I have to submit a receipt?", gold: ["H11"] }, { q: "Do remote workers get money for internet?", gold: ["H12"] },
  { q: "When does health insurance start for a new hire?", gold: ["H13"] }, { q: "What is the company 401k match?", gold: ["H14"] },
  { q: "Am I eligible for FMLA after 8 months?", gold: ["H15"] }, { q: "How many days off for a funeral?", gold: ["H16"] }
];
const EMPLOYEES = [
  { id: "E-1042", name: "Dana Whitaker", title: "Customer Success Specialist", dept: "Customer Success", manager: "Luis Ortega", state: "CO", flsa: "non-exempt", fte: 1, rate: 26, start: "2023-03-13", pto: 22.5, pendingPto: [] },
  { id: "E-1077", name: "Raj Patel", title: "Warehouse Associate", dept: "Warehouse Ops", manager: "Kim Alvarez", state: "WA", flsa: "non-exempt", fte: 1, rate: 22, start: "2024-06-03", pto: 41.2, pendingPto: [] },
  { id: "E-1103", name: "Priya Nair", title: "Marketing Manager", dept: "Marketing", manager: "Jordan Blake", state: "OR", flsa: "exempt", fte: 1, rate: null, salary: 98000, start: "2026-10-05", pto: 0, pendingPto: [], onboarding: { i9: "pending", directDeposit: "not set", benefits: "not started", laptop: "not ordered" } },
  { id: "E-1019", name: "Marcus Lee", title: "Senior Financial Analyst", dept: "Finance", manager: "Grace Chen", state: "MT", flsa: "exempt", fte: 1, rate: null, salary: 104000, start: "2019-08-19", pto: 96, pendingPto: [] },
  { id: "E-1150", name: "Ana Ruiz", title: "Support Associate", dept: "Customer Success", manager: "Luis Ortega", state: "ID", flsa: "non-exempt", fte: .5, rate: 21, start: "2025-02-10", pto: 18.4, pendingPto: [] }
];
const PAYDAYS_2026 = ["2026-09-11", "2026-09-25", "2026-10-09", "2026-10-23", "2026-11-06", "2026-11-20", "2026-12-04", "2026-12-18"];
const TIMECARDS = {
  "E-1077": { period: "Sep 6 – Sep 19, 2026", payday: "2026-09-25", weeks: [
    { week: "Sep 6 – Sep 12", days: [["Mon Sep 7", "Holiday (Labor Day)", 0], ["Tue Sep 8", "7:00a–3:30p", 8], ["Wed Sep 9", "7:00a–3:30p", 8], ["Thu Sep 10", "7:00a–3:30p", 8], ["Fri Sep 11", "7:00a–3:30p", 8]], recorded: 32, holiday: 8 },
    { week: "Sep 13 – Sep 19", days: [["Mon Sep 14", "6:30a–5:00p", 10], ["Tue Sep 15", "6:30a–(missed out-punch)", 0, "Missed punch: correction for 4.0 h submitted Sep 16, awaiting manager approval"], ["Wed Sep 16", "6:30a–5:00p", 10], ["Thu Sep 17", "6:30a–5:00p", 10], ["Fri Sep 18", "7:00a–3:30p", 8]], recorded: 38, pending: 4 }
  ] }
};
const PAYCHECKS = { "E-1077|2026-09-25": { gross: 1716, lines: [["Regular", 70, 22, 1540], ["Holiday", 8, 22, 176]], note: "Week of Sep 13–19 paid at 38.0 recorded hours. 4.0 hours on Sep 15 are pending approval and weren't included." } };
const TICKET_QUEUES = ["Payroll", "HR", "IT", "Security", "Benefits"];
function findEmployee(q) {
  const s = String(q || "").toLowerCase().trim();
  return EMPLOYEES.find(e => e.id.toLowerCase() === s) || EMPLOYEES.find(e => e.name.toLowerCase() === s) || EMPLOYEES.find(e => s && (e.name.toLowerCase().includes(s) || s.includes(e.name.split(" ")[0].toLowerCase()) && s.includes(e.name.split(" ")[1].toLowerCase()))) || EMPLOYEES.find(e => s && s.split(/\s+/).some(w => w.length > 2 && e.name.toLowerCase().split(" ").includes(w)));
}
function ptoProjection(e, until) {
  const end = until || new Date(2026, 11, 31);
  const accr = 4.62 * e.fte; const paydays = PAYDAYS_2026.map(parseISO).filter(d => d > DEMO_TODAY && d <= end);
  return { accrualPerPeriod: +accr.toFixed(2), paydaysLeft: paydays.length, projected: +(e.pto + accr * paydays.length).toFixed(2), nextPayday: paydays[0] ? iso(paydays[0]) : null };
}
let HANDBOOK_INDEX = null;
function handbookIndex() { if (!HANDBOOK_INDEX) HANDBOOK_INDEX = new BM25(HANDBOOK); return HANDBOOK_INDEX; }

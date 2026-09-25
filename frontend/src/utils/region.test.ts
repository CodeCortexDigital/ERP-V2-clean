import { describe, expect, it } from 'vitest';
import { localizeLabel, paymentOptions } from './region';

const US = { challan: 'Invoice', date_sheet: 'Exam Schedule', award_list: 'Grade Sheet', result_card: 'Report Card', paid_slips: 'Receipts',
  fee_defaulters: 'Past-due Accounts', fee_particulars: 'Fee Items', admission_letter: 'Acceptance Letter', b_form: 'Birth Certificate No.',
  cnic: 'ID Number', cheque: 'Check', timetable: 'Schedule', enrolment: 'Enrollment', principal: 'Principal' };
const PK = Object.fromEntries(Object.keys(US).map((k) => [k, ({ challan: 'Challan', date_sheet: 'Date Sheet', award_list: 'Award List', result_card: 'Result Card',
  paid_slips: 'Paid Slips', fee_defaulters: 'Fee Defaulters', fee_particulars: 'Fee Particulars', admission_letter: 'Admission Letter', b_form: 'B-Form',
  cnic: 'CNIC', cheque: 'Cheque', timetable: 'Timetable', enrolment: 'Enrolment', principal: 'Principal' } as Record<string, string>)[k]]));

describe('region wording', () => {
  it('swaps Pakistani phrases for a US school', () => {
    expect(localizeLabel('Date Sheet', US)).toBe('Exam Schedule');
    expect(localizeLabel('Fee Defaulters', US)).toBe('Past-due Accounts');
    expect(localizeLabel('Print Challans', US)).toBe('Print Invoices');
    expect(localizeLabel('My Timetable', US)).toBe('My Schedule');
    expect(localizeLabel('Enrolment', US)).toBe('Enrollment');
    expect(localizeLabel('Pay by Cheque', US)).toBe('Pay by Check');
  });
  it('leaves Pakistan-style schools, other text and other languages alone', () => {
    expect(localizeLabel('Date Sheet', PK)).toBe('Date Sheet');
    expect(localizeLabel('Students', US)).toBe('Students');
    expect(localizeLabel('Datums-Blatt', US)).toBe('Datums-Blatt');
    expect(localizeLabel('Timetables', US)).toBe('Timetables'); // whole words only
  });
});

describe('payment options', () => {
  it('groups a region’s methods onto what a payment records', () => {
    const pk = paymentOptions([{ code: 'cash', label: 'Cash' }, { code: 'bank_transfer', label: 'Bank transfer' }, { code: 'jazzcash', label: 'JazzCash' },
      { code: 'easypaisa', label: 'Easypaisa' }, { code: 'cheque', label: 'Cheque' }]);
    expect(pk).toEqual([{ value: 'cash', label: 'Cash' }, { value: 'bank_transfer', label: 'Bank transfer' },
      { value: 'online', label: 'Online (JazzCash, Easypaisa)' }, { value: 'cheque', label: 'Cheque' }]);
    const us = paymentOptions([{ code: 'card', label: 'Card' }, { code: 'ach', label: 'ACH bank transfer' }, { code: 'check', label: 'Check' }, { code: 'cash', label: 'Cash' }]);
    expect(us.map((o) => o.value)).toEqual(['credit_card', 'bank_transfer', 'cheque', 'cash', 'online']);
    expect(us.find((o) => o.value === 'cheque')?.label).toBe('Check');
  });
});

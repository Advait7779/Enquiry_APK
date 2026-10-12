import assert from 'node:assert/strict';
import test from 'node:test';
import { Request, Response } from 'express';
import { dbService } from '../config/db';
import { enquiryController } from './enquiryController';

test('junior lawyers cannot submit work outside their current assignments', async () => {
  const originalCreate = dbService.createEnquiry;
  let created = 0;
  dbService.createEnquiry = async (data: any) => {
    created += 1;
    return { ...data, id: 'enquiry-1', entryTime: new Date(), feesPaid: 0 } as any;
  };

  const submit = async (assignedTask: string, purpose: string) => {
    let status = 200;
    let body: any;
    const response = {
      status(value: number) { status = value; return this; },
      json(value: unknown) { body = value; return this; },
    } as Response;
    const request = {
      body: { fullName: 'Asha Patil', contactNo: '9876543210', purpose, assignedTask },
      user: { role: 'lawyer', lawyerId: 'lawyer-1', lawyerName: 'Adv. Rao', assignedTasks: ['Property & Land Dispute', 'Other / Custom Enquiry'] },
    } as unknown as Request;
    await enquiryController.createEnquiry(request, response);
    return { status, body };
  };

  try {
    assert.equal((await submit('Bail & Criminal Matter', 'Bail & Criminal Matter')).status, 403);
    assert.equal((await submit('Property & Land Dispute', 'Bail & Criminal Matter')).status, 400);
    assert.equal(created, 0);
    assert.equal((await submit('Other / Custom Enquiry', 'Specific property advice')).status, 201);
    assert.equal(created, 1);
  } finally {
    dbService.createEnquiry = originalCreate;
  }
});

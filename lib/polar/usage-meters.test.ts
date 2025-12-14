/**
 * Tests for usage meter tracking functions
 *
 * These tests verify the core functionality of meter balance checking
 * and usage event recording.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  checkMeterBalance,
  recordUsageEvent,
  getMeterBalances,
} from './usage-meters';
import * as client from './client';

// Mock dependencies
vi.mock('./client');
vi.mock('../redis');
vi.mock('../datadog/logger');
vi.mock('../config', () => ({
  config: {
    polar: {
      accessToken: 'test-token',
      webhookSecret: 'test-secret',
      products: {
        free: 'prod_free',
        pro: 'prod_pro',
        enterprise: 'prod_enterprise',
      },
      meters: {
        jobDescriptions: 'meter_job_desc',
        candidateScreenings: 'meter_candidate',
      },
    },
  },
}));

describe('Usage Meters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkMeterBalance', () => {
    it('should return meter balance from customer state', async () => {
      const mockCustomerState = {
        activeMeters: [
          {
            id: 'meter-1',
            meterId: 'meter_job_desc',
            consumedUnits: 5,
            creditedUnits: 50,
            balance: 45,
            createdAt: new Date(),
            modifiedAt: new Date(),
          },
        ],
      };

      vi.mocked(client.getCustomerState).mockResolvedValue(mockCustomerState as any);

      const result = await checkMeterBalance('org-123', 'job_descriptions');

      expect(result.allowed).toBe(true);
      expect(result.unlimited).toBe(false);
      expect(result.balance).toBe(45);
      expect(result.limit).toBe(50);
    });

    it('should return not allowed when balance is zero', async () => {
      const mockCustomerState = {
        activeMeters: [
          {
            id: 'meter-1',
            meterId: 'meter_job_desc',
            consumedUnits: 50,
            creditedUnits: 50,
            balance: 0,
            createdAt: new Date(),
            modifiedAt: new Date(),
          },
        ],
      };

      vi.mocked(client.getCustomerState).mockResolvedValue(mockCustomerState as any);

      const result = await checkMeterBalance('org-123', 'job_descriptions');

      expect(result.allowed).toBe(false);
      expect(result.balance).toBe(0);
    });
  });

  describe('recordUsageEvent', () => {
    it('should record job description event', async () => {
      vi.mocked(client.ingestUsageEvents).mockResolvedValue({
        inserted: 1,
        duplicates: 0,
      });

      await recordUsageEvent('org-123', 'job_descriptions', {
        userId: 'user-1',
        resourceId: 'project-1',
      });

      expect(client.ingestUsageEvents).toHaveBeenCalledWith([
        expect.objectContaining({
          name: 'job_description_generated',
          externalCustomerId: 'org-123',
          metadata: expect.objectContaining({
            meterName: 'job_descriptions',
            userId: 'user-1',
            resourceId: 'project-1',
          }),
        }),
      ]);
    });

    it('should record candidate screening event', async () => {
      vi.mocked(client.ingestUsageEvents).mockResolvedValue({
        inserted: 1,
        duplicates: 0,
      });

      await recordUsageEvent('org-123', 'candidate_screenings', {
        userId: 'user-2',
        resourceId: 'issue-1',
      });

      expect(client.ingestUsageEvents).toHaveBeenCalledWith([
        expect.objectContaining({
          name: 'candidate_screened',
          externalCustomerId: 'org-123',
          metadata: expect.objectContaining({
            meterName: 'candidate_screenings',
            userId: 'user-2',
            resourceId: 'issue-1',
          }),
        }),
      ]);
    });

    it('should queue failed events for retry', async () => {
      vi.mocked(client.ingestUsageEvents).mockRejectedValue(new Error('API error'));
      vi.mocked(redisStorage.queueFailedEvent).mockResolvedValue();

      await recordUsageEvent('org-123', 'job_descriptions', {
        userId: 'user-1',
        resourceId: 'project-1',
      });

      expect(redisStorage.queueFailedEvent).toHaveBeenCalledWith(
        'org-123',
        expect.objectContaining({
          name: 'job_description_generated',
          externalCustomerId: 'org-123',
        })
      );
    });
  });

  describe('getMeterBalances', () => {
    it('should return actual balances from customer state', async () => {
      const mockCustomerState = {
        activeMeters: [
          {
            id: 'meter-1',
            meterId: 'meter_job_desc',
            consumedUnits: 5,
            creditedUnits: 50,
            balance: 45,
            createdAt: new Date(),
            modifiedAt: new Date(),
          },
          {
            id: 'meter-2',
            meterId: 'meter_candidate',
            consumedUnits: 100,
            creditedUnits: 500,
            balance: 400,
            createdAt: new Date(),
            modifiedAt: new Date(),
          },
        ],
      };

      vi.mocked(client.getCustomerState).mockResolvedValue(mockCustomerState as any);

      const result = await getMeterBalances('org-123');

      expect(result).toHaveLength(2);
      expect(result[0].meterName).toBe('job_descriptions');
      expect(result[0].balance).toBe(45);
      expect(result[0].unlimited).toBe(false);
      expect(result[1].meterName).toBe('candidate_screenings');
      expect(result[1].balance).toBe(400);
      expect(result[1].unlimited).toBe(false);
    });
  });
});

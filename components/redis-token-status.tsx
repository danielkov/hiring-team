"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { saveOrgConfigToRedis } from "@/lib/linear/redis-actions";
import Link from "next/link";

interface RedisTokenStatusProps {
  initialHasConfig: boolean;
  orgId: string;
  orgName: string;
}

export function RedisTokenStatus({ initialHasConfig, orgId, orgName }: RedisTokenStatusProps) {
  const [hasConfig, setHasConfig] = useState(initialHasConfig);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSaveConfig = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await saveOrgConfigToRedis();

      if (!result.success) {
        throw new Error(result.error || 'Failed to save configuration');
      }

      setHasConfig(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Public Job Board Access</h2>
      
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className={`mt-1 w-2 h-2 rounded-full ${hasConfig ? 'bg-green-500' : 'bg-yellow-500'}`} />
          <div className="flex-1">
            <p className="text-sm font-medium">
              {hasConfig ? 'Configuration Synced' : 'Configuration Not Synced'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {hasConfig 
                ? <>Your organization configuration is stored in Redis. Public job board is accessible at <Link className="underline" href={`/jobs/${orgName}`}>/jobs/{orgName}</Link></>
                : 'Sync your organization configuration to Redis to enable public job board access'
              }
            </p>
          </div>
        </div>

        {!hasConfig && (
          <Button 
            onClick={handleSaveConfig} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Syncing...' : 'Sync Configuration to Redis'}
          </Button>
        )}

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <div className="text-xs text-muted-foreground pt-2 border-t">
          <p><strong>Organization:</strong> {orgName}</p>
          <p><strong>Org ID:</strong> {orgId}</p>
        </div>
      </div>
    </div>
  );
}

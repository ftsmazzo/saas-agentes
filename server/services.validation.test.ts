import { describe, expect, it } from "vitest";
import axios from "axios";

describe("EasyPanel Services Validation", () => {
  it("should validate Evolution API connection", async () => {
    const evolutionUrl = process.env.EVOLUTION_API_URL;
    const evolutionKey = process.env.EVOLUTION_API_KEY;

    expect(evolutionUrl).toBeDefined();
    expect(evolutionKey).toBeDefined();

    const response = await axios.get(`${evolutionUrl}/instance/fetchInstances`, {
      headers: {
        "apikey": evolutionKey
      }
    });

    expect(response.status).toBe(200);
  });

  it("should validate N8N API connection", async () => {
    const n8nUrl = process.env.N8N_API_URL;
    const n8nKey = process.env.N8N_API_KEY;
    const templateId = process.env.N8N_TEMPLATE_WORKFLOW_ID;

    expect(n8nUrl).toBeDefined();
    expect(n8nKey).toBeDefined();
    expect(templateId).toBeDefined();

    const response = await axios.get(`${n8nUrl}/api/v1/workflows`, {
      headers: {
        "X-N8N-API-KEY": n8nKey
      }
    });

    expect(response.status).toBe(200);
    expect(Array.isArray(response.data.data)).toBe(true);
  });

  it("should validate Chatwoot API connection", async () => {
    const chatwootUrl = process.env.CHATWOOT_URL;
    const chatwootToken = process.env.CHATWOOT_API_TOKEN;
    const chatwootAccountId = process.env.CHATWOOT_ACCOUNT_ID;

    expect(chatwootUrl).toBeDefined();
    expect(chatwootToken).toBeDefined();
    expect(chatwootAccountId).toBeDefined();

    const response = await axios.get(
      `${chatwootUrl}/api/v1/accounts/${chatwootAccountId}`,
      {
        headers: {
          "api_access_token": chatwootToken
        }
      }
    );

    expect(response.status).toBe(200);
    expect(response.data.id).toBe(parseInt(chatwootAccountId || "1"));
  });
});

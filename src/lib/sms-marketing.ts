import { apiClient } from "./api-client";

export interface SmsTemplate {
  id: string;
  category: "festival" | "discount" | "stock_update" | "business_promotion" | "invoice_milestone_reminders" | "birthday_reminders" | string;
  template: string;
  example: string;
  dlt_te_id?: string;
  displayText?: string;
  is_active?: boolean;
}

export interface SmsCampaignRecipient {
  id: string;
  party_id?: string;
  party_name: string;
  mobile_number: string;
  status: "DELIVERED" | "SENT" | "FAILED" | "PENDING";
  delivered_at?: string;
}

export interface SmsCampaign {
  id: string;
  name: string;
  category: string;
  template_id?: string;
  message: string;
  variables?: Record<string, string>;
  number_of_recipients: number;
  status: "SENT" | "SCHEDULED" | "DELIVERED" | "FAILED";
  created_at: string;
  updated_at?: string;
  recipients?: SmsCampaignRecipient[];
}

export interface SmsQuota {
  actual_quota_remaining: number;
  total_quota: number;
  used_quota: number;
  sample_quota_remaining: number;
}

export interface PartyGreetingSettings {
  invoice_milestone: {
    enabled: boolean;
    template_id: string;
    example: string;
  };
  birthday_reminder: {
    enabled: boolean;
    template_id: string;
    example: string;
  };
  additional_settings?: Array<{
    id?: string;
    key: string;
    label?: string;
    value?: string;
  }>;
}

export const PRE_APPROVED_TEMPLATES: SmsTemplate[] = [
  // Festival Templates
  {
    id: "fest_01",
    category: "festival",
    template:
      "Dear Customer, Wishing you a joyous %{festival_name}! Special festive celebration offer: Get flat %{discount_pct} off on %{items} at %{business_name}. Valid till %{valid_till}. Visit today! Contact: %{mobile_number}",
    example:
      "Dear Customer, Wishing you a joyous Diwali! Special festive celebration offer: Get flat 15% off on all items at JK ENTERPRISE. Valid till 15 Nov 2026. Visit today! Contact: 9898990001",
    dlt_te_id: "1407161234567801",
    is_active: true,
  },
  {
    id: "fest_02",
    category: "festival",
    template:
      "Warm %{festival_name} greetings from %{business_name}! Enjoy up to %{discount_pct} discount on your favorite products. Call %{mobile_number} to place your order.",
    example:
      "Warm New Year greetings from JK ENTERPRISE! Enjoy up to 20% discount on your favorite products. Call 9898990001 to place your order.",
    dlt_te_id: "1407161234567802",
    is_active: true,
  },
  {
    id: "fest_03",
    category: "festival",
    template:
      "Celebrate this festive season with %{business_name}! Special bundle offers with %{discount_pct} off on %{items}. Limited period offer. Helpline: %{mobile_number}",
    example:
      "Celebrate this festive season with JK ENTERPRISE! Special bundle offers with 10% off on premium stock. Limited period offer. Helpline: 9898990001",
    dlt_te_id: "1407161234567803",
    is_active: true,
  },

  // Discount Templates
  {
    id: "disc_01",
    category: "discount",
    template:
      "Mega Sale Alert! Get exclusive %{discount_pct} discount on all purchases at %{business_name}. Don't miss out on big savings. Valid till %{valid_till}. Call: %{mobile_number}",
    example:
      "Mega Sale Alert! Get exclusive 25% discount on all purchases at JK ENTERPRISE. Don't miss out on big savings. Valid till 30 Nov 2026. Call: 9898990001",
    dlt_te_id: "1407161234567804",
    is_active: true,
  },
  {
    id: "disc_02",
    category: "discount",
    template:
      "Special discount just for you! Visit %{business_name} today and avail flat %{discount_pct} off on %{items}. Contact us at %{mobile_number}",
    example:
      "Special discount just for you! Visit JK ENTERPRISE today and avail flat 10% off on all items. Contact us at 9898990001",
    dlt_te_id: "1407161234567805",
    is_active: true,
  },
  {
    id: "disc_03",
    category: "discount",
    template:
      "Weekend Flash Sale at %{business_name}! Save %{discount_pct} on all billings. Hurry, offer valid while stocks last. Phone: %{mobile_number}",
    example:
      "Weekend Flash Sale at JK ENTERPRISE! Save 15% on all billings. Hurry, offer valid while stocks last. Phone: 9898990001",
    dlt_te_id: "1407161234567806",
    is_active: true,
  },

  // Stock Update Templates
  {
    id: "stock_01",
    category: "stock_update",
    template:
      "New Arrivals Alert! Fresh stock of %{items} has arrived at %{business_name}. Be the first to grab the best products! Contact %{mobile_number}",
    example:
      "New Arrivals Alert! Fresh stock of seasonal items has arrived at JK ENTERPRISE. Be the first to grab the best products! Contact 9898990001",
    dlt_te_id: "1407161234567807",
    is_active: true,
  },
  {
    id: "stock_02",
    category: "stock_update",
    template:
      "Popular items are back in stock at %{business_name}! Stock up on %{items} today before it sells out. Call %{mobile_number} to order now.",
    example:
      "Popular items are back in stock at JK ENTERPRISE! Stock up on fast moving items today before it sells out. Call 9898990001 to order now.",
    dlt_te_id: "1407161234567808",
    is_active: true,
  },

  // Business Promotion Templates
  {
    id: "promo_01",
    category: "business_promotion",
    template:
      "Thank you for being our valued partner. %{business_name} offers premium quality %{items} at wholesale rates. Get in touch at %{mobile_number}",
    example:
      "Thank you for being our valued partner. JK ENTERPRISE offers premium quality goods at wholesale rates. Get in touch at 9898990001",
    dlt_te_id: "1407161234567809",
    is_active: true,
  },
  {
    id: "promo_02",
    category: "business_promotion",
    template:
      "Exciting update from %{business_name}! We have expanded our range of %{items} to serve you better. Visit us or contact %{mobile_number}",
    example:
      "Exciting update from JK ENTERPRISE! We have expanded our range of products to serve you better. Visit us or contact 9898990001",
    dlt_te_id: "1407161234567810",
    is_active: true,
  },
];

export const REMINDER_TEMPLATES_DATA: SmsTemplate[] = [
  {
    id: "milestone_01",
    category: "invoice_milestone_reminders",
    template:
      "Dear Customer, congratulations on completing your milestone bill with %{business_name}! We truly value your continued trust and loyalty.",
    example:
      "Dear Customer, congratulations on completing your milestone bill with JK ENTERPRISE! We truly value your continued trust and loyalty.",
    dlt_te_id: "1407161234567821",
    is_active: true,
  },
  {
    id: "milestone_02",
    category: "invoice_milestone_reminders",
    template:
      "Thank you for your repeat business with %{business_name}! To celebrate our milestone invoice, here is a special thank you note from our team.",
    example:
      "Thank you for your repeat business with JK ENTERPRISE! To celebrate our milestone invoice, here is a special thank you note from our team.",
    dlt_te_id: "1407161234567822",
    is_active: true,
  },
  {
    id: "birthday_01",
    category: "birthday_reminders",
    template:
      "Wishing you a very Happy Birthday! May your day be filled with happiness and prosperity. Warm regards, %{business_name}.",
    example:
      "Wishing you a very Happy Birthday! May your day be filled with happiness and prosperity. Warm regards, JK ENTERPRISE.",
    dlt_te_id: "1407161234567831",
    is_active: true,
  },
  {
    id: "birthday_02",
    category: "birthday_reminders",
    template:
      "Happy Birthday from everyone at %{business_name}! As a birthday gift, enjoy an exclusive offer on your next purchase with us.",
    example:
      "Happy Birthday from everyone at JK ENTERPRISE! As a birthday gift, enjoy an exclusive offer on your next purchase with us.",
    dlt_te_id: "1407161234567832",
    is_active: true,
  },
];

export const smsMarketingApi = {
  async getQuota(): Promise<SmsQuota> {
    try {
      return await apiClient.get<SmsQuota>("/sms-marketing/quota");
    } catch {
      // Fallback
      return {
        actual_quota_remaining: 500,
        total_quota: 500,
        used_quota: 0,
        sample_quota_remaining: 5,
      };
    }
  },

  async getCampaigns(sortOrder: "ASC" | "DESC" = "DESC"): Promise<SmsCampaign[]> {
    try {
      return await apiClient.get<SmsCampaign[]>(`/web/campaigns?sort_order=${sortOrder}`);
    } catch {
      return [];
    }
  },

  async getCampaignRecipients(
    campaignId: string,
  ): Promise<{ campaign: SmsCampaign; recipients: SmsCampaignRecipient[] }> {
    return apiClient.get<{ campaign: SmsCampaign; recipients: SmsCampaignRecipient[] }>(
      `/web/campaigns/${campaignId}/show_campaign_recipients`,
    );
  },

  async getTemplates(category?: string): Promise<SmsTemplate[]> {
    try {
      const url = category && category !== "all"
        ? `/web/templates?category=${encodeURIComponent(category)}&is_active=true`
        : `/web/templates`;
      const res = await apiClient.get<SmsTemplate[]>(url);
      if (Array.isArray(res) && res.length > 0) return res;
    } catch {
      // Fallback to pre-approved
    }

    if (!category || category === "all") return PRE_APPROVED_TEMPLATES;
    return PRE_APPROVED_TEMPLATES.filter((t) => t.category.toLowerCase() === category.toLowerCase());
  },

  async getReminderTemplates(params?: { id?: string[]; category?: string }): Promise<SmsTemplate[]> {
    try {
      const query = new URLSearchParams();
      if (params?.category) query.append("category", params.category);
      if (params?.id) {
        params.id.forEach((id) => query.append("id[]", id));
      }
      const res = await apiClient.get<SmsTemplate[]>(
        `/web/templates/reminder_templates?${query.toString()}`,
      );
      if (Array.isArray(res) && res.length > 0) return res;
    } catch {
      // Fallback
    }

    let list = REMINDER_TEMPLATES_DATA;
    if (params?.id && params.id.length > 0) {
      list = list.filter((t) => params.id!.includes(t.id));
    }
    if (params?.category) {
      list = list.filter((t) => t.category.toLowerCase() === params.category!.toLowerCase());
    }
    return list;
  },

  async createCampaign(payload: {
    name?: string;
    category: string;
    template_id?: string;
    message: string;
    variables?: Record<string, string>;
    partyIds?: string[];
    recipients?: Array<{ partyId?: string; partyName: string; mobileNumber: string }>;
  }): Promise<{ success: boolean; campaign: SmsCampaign; quota_remaining: number }> {
    return apiClient.post<{ success: boolean; campaign: SmsCampaign; quota_remaining: number }>(
      "/web/campaigns",
      payload,
    );
  },

  async testCampaign(
    campaignId: string,
    payload: { mobile_number: string; message?: string },
  ): Promise<{ success: boolean; message: string }> {
    return apiClient.post<{ success: boolean; message: string }>(
      `/web/campaigns/${campaignId}/test_campaign`,
      payload,
    );
  },

  async getTestSmsQuota(
    campaignId: string,
  ): Promise<{ remaining_quota: number; total_quota: number }> {
    try {
      return await apiClient.get<{ remaining_quota: number; total_quota: number }>(
        `/web/campaigns/${campaignId}/check_sample_campaign_quota`,
      );
    } catch {
      return { remaining_quota: 5, total_quota: 5 };
    }
  },

  async getPartyGreetingSettings(): Promise<PartyGreetingSettings> {
    try {
      return await apiClient.get<PartyGreetingSettings>("/sms-marketing/party-settings");
    } catch {
      return {
        invoice_milestone: {
          enabled: true,
          template_id: "milestone_01",
          example:
            "Dear Customer, congratulations on completing your milestone bill with our firm! We truly value your trust.",
        },
        birthday_reminder: {
          enabled: true,
          template_id: "birthday_01",
          example:
            "Wishing you a very Happy Birthday! May your day be filled with happiness and prosperity.",
        },
        additional_settings: [],
      };
    }
  },

  async savePartyGreetingSettings(
    settings: PartyGreetingSettings,
  ): Promise<{ success: boolean; party: PartyGreetingSettings }> {
    return apiClient.put<{ success: boolean; party: PartyGreetingSettings }>(
      "/sms-marketing/party-settings",
      settings,
    );
  },
};

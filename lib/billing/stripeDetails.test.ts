import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCustomersRetrieve = vi.fn();
const mockSubscriptionsList = vi.fn();
const mockInvoicesList = vi.fn();

vi.mock("./stripe", () => ({
  getStripeClient: () => ({
    customers: { retrieve: mockCustomersRetrieve },
    subscriptions: { list: mockSubscriptionsList },
    invoices: { list: mockInvoicesList },
  }),
}));

const { getBillingDetails } = await import("./stripeDetails");

beforeEach(() => {
  vi.clearAllMocks();
  mockCustomersRetrieve.mockResolvedValue({ deleted: false, invoice_settings: { default_payment_method: null } });
  mockSubscriptionsList.mockResolvedValue({ data: [] });
  mockInvoicesList.mockResolvedValue({ data: [] });
});

describe("getBillingDetails", () => {
  it("returns null paymentMethod when no default payment method is set", async () => {
    const result = await getBillingDetails("cus_1");
    expect(result.paymentMethod).toBeNull();
  });

  it("returns null paymentMethod when the customer is deleted", async () => {
    mockCustomersRetrieve.mockResolvedValue({ deleted: true });
    const result = await getBillingDetails("cus_1");
    expect(result.paymentMethod).toBeNull();
  });

  it("extracts card details from an expanded default payment method", async () => {
    mockCustomersRetrieve.mockResolvedValue({
      deleted: false,
      invoice_settings: {
        default_payment_method: {
          id: "pm_1",
          type: "card",
          card: { brand: "visa", last4: "4242", exp_month: 11, exp_year: 2030 },
        },
      },
    });

    const result = await getBillingDetails("cus_1");

    expect(result.paymentMethod).toEqual({ brand: "visa", last4: "4242", expMonth: 11, expYear: 2030 });
  });

  it("returns null subscription when the customer has none", async () => {
    const result = await getBillingDetails("cus_1");
    expect(result.subscription).toBeNull();
  });

  it("maps the current subscription's period end and cancel-at-period-end flag", async () => {
    mockSubscriptionsList.mockResolvedValue({
      data: [{ current_period_end: 1_757_000_000, cancel_at_period_end: true }],
    });

    const result = await getBillingDetails("cus_1");

    expect(result.subscription).toEqual({
      currentPeriodEnd: new Date(1_757_000_000 * 1000).toISOString(),
      cancelAtPeriodEnd: true,
    });
  });

  it("maps invoices to a plain summary shape, newest first as Stripe returns them", async () => {
    mockInvoicesList.mockResolvedValue({
      data: [
        {
          id: "in_1",
          number: "FRED-0001",
          status: "paid",
          amount_paid: 99000,
          currency: "sek",
          created: 1_756_000_000,
          hosted_invoice_url: "https://invoice.stripe.com/i/in_1",
        },
      ],
    });

    const result = await getBillingDetails("cus_1");

    expect(result.invoices).toEqual([
      {
        id: "in_1",
        number: "FRED-0001",
        status: "paid",
        amountPaid: 99000,
        currency: "sek",
        created: new Date(1_756_000_000 * 1000).toISOString(),
        hostedInvoiceUrl: "https://invoice.stripe.com/i/in_1",
      },
    ]);
  });

  it("requests at most the last 12 invoices for the given customer", async () => {
    await getBillingDetails("cus_1");
    expect(mockInvoicesList).toHaveBeenCalledWith(expect.objectContaining({ customer: "cus_1", limit: 12 }));
  });
});

/* service/api/plainterms-api/hello-world/getResult.mjs */

export const handler = async (event) => {
  const id = event?.pathParameters?.id ?? "demo_123";

  const body = {
    schema_version: "pt.ui.v1",
    result_id: id,
    created_at: new Date().toISOString(),
    headline: "Summary",
    overview:
      "This agreement describes a contractor providing services to a company in exchange for payment, with standard terms around confidentiality, ownership of work, and how the relationship ends.",
    gentle_notice:
      "Some common sections in contractor agreements (such as detailed scope and acceptance criteria) are not clearly stated in this document.",
    sections: [
      {
        key: "who_involved",
        status: "present",
        body:
          "The agreement identifies a company as the client and an individual as the contractor. It describes them as the parties to the agreement.",
        quotes: ['("Company")', '("Contractor")']
      },
      {
        key: "work_included",
        status: "unclear",
        body:
          "This agreement mentions the services, but key details are not clearly stated. The document refers to a separate statement of work for specifics.",
        quotes: ["Services will be described in a Statement of Work."]
      },
      {
        key: "pay_invoicing",
        status: "present",
        body:
          "Payment is described as a monthly fee, invoiced on a regular cadence, with payment due within a stated number of days after an invoice.",
        soft_note: "This is a common structure in contractor agreements.",
        quotes: ["Company will pay Contractor a monthly fee."]
      }
    ],
    notices: {
      not_legal_advice:
        "This summary is for informational purposes only and is not legal advice."
    }
  };

  return {
    statusCode: 200,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*"
    },
    body: JSON.stringify(body)
  };
};

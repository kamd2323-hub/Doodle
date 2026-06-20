import OpenAI from 'openai'

export interface TemplateData {
  email_subject: string;
  email_body: string;
}

export interface ClientData {
  name: string;
  email: string;
  phone?: string | null;
  company_name?: string | null;
}

export interface InvoiceData {
  invoice_number?: string | null;
  amount_due_cents: number;
  currency: string;
  due_at: string;
  payment_link?: string | null;
}

export interface PersonalizationResult {
  subject: string;
  body: string;
}

/**
 * Fallback template replacement engine using RegExp.
 * Guaranteed to succeed without external API calls or latency.
 */
export function personalizeFallback(
  template: TemplateData,
  invoice: InvoiceData,
  client: ClientData
): PersonalizationResult {
  const amountFormatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: invoice.currency || 'USD',
  }).format(invoice.amount_due_cents / 100);

  const dueDateFormatted = new Date(invoice.due_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const placeholders: Record<string, string> = {
    '{{customer_name}}': client.name || 'Valued Customer',
    '{{company_name}}': client.company_name || client.name || 'your company',
    '{{invoice_number}}': invoice.invoice_number || 'unspecified invoice',
    '{{amount_due}}': amountFormatted,
    '{{due_date}}': dueDateFormatted,
    '{{payment_link}}': invoice.payment_link || 'our secure payment portal',
  };

  let subject = template.email_subject;
  let body = template.email_body;

  Object.entries(placeholders).forEach(([key, value]) => {
    subject = subject.replaceAll(key, value);
    body = body.replaceAll(key, value);
  });

  return { subject, body };
}

/**
 * AI-powered email personalization engine using OpenAI.
 * Resolves placeholders, refines communication tone to be professional but firm,
 * and maintains strict compliance with honesty and acceptable use guidelines.
 */
export async function personalizeEmail(
  template: TemplateData,
  invoice: InvoiceData,
  client: ClientData
): Promise<PersonalizationResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  const isMock = !apiKey || 
                 apiKey === 'your-openai-api-key' || 
                 apiKey.startsWith('mock_') || 
                 apiKey.includes('placeholder');

  if (isMock) {
    console.log('[AIEngine] OpenAI API Key is mock or placeholder. Switching to high-performance local template engine fallback.');
    return personalizeFallback(template, invoice, client);
  }

  try {
    const openai = new OpenAI({ apiKey });

    const amountFormatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: invoice.currency || 'USD',
    }).format(invoice.amount_due_cents / 100);

    const dueDateFormatted = new Date(invoice.due_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const systemPrompt = `You are Reclaim AI's senior automated billing communications specialist. Your goal is to customize payment recovery emails to be professional, clear, respectful, but firm.

### TASK:
Your task is to take a subject and body template (which may contain placeholders like {{customer_name}}, {{amount_due}}, {{due_date}}, {{invoice_number}}, etc.) and replace them with the concrete client and invoice data provided. Optionally, make subtle tone refinements to make sure the email is professional but clear about the outstanding balance.

### IMPORTANT ETHICAL & HONESTY GUIDELINES:
1. **Never deceive**: State facts truthfully. Do not lie or invent late fees, interest penalties, legal threats, or actions that aren't verified in the data.
2. **Never intimidate**: Do not use manufactured urgency, fake court references, or aggressive pressure tactics.
3. **No impersonation**: Never pretend to be a lawyer, collections agency, or government entity. Reclaim AI communications represent the sender clearly and professionally.
4. **Actionable links**: Ensure the payment link (if provided) is presented clearly as the primary path to resolve the invoice.
5. **Clear escape hatch**: Ensure the email includes a polite line encouraging the recipient to reply or get in touch if they have questions or want to discuss a payment plan.

### FORMAT:
You MUST respond with a valid JSON object matching this schema:
{
  "subject": "Filled-in and refined subject line",
  "body": "Filled-in and refined email body text (Markdown or plain text)"
}`;

    const userPrompt = JSON.stringify({
      template: {
        subject: template.email_subject,
        body: template.email_body
      },
      invoice: {
        number: invoice.invoice_number,
        amount_due: amountFormatted,
        due_date: dueDateFormatted,
        payment_link: invoice.payment_link
      },
      client: {
        name: client.name,
        company_name: client.company_name,
        email: client.email
      }
    }, null, 2);

    console.log('[AIEngine] Contacting OpenAI API...');
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI returned an empty response.');
    }

    const result = JSON.parse(content) as PersonalizationResult;
    
    if (!result.subject || !result.body) {
      throw new Error('OpenAI response JSON structure was invalid.');
    }

    console.log('[AIEngine] Successfully generated personalized email via OpenAI.');
    return result;
  } catch (err: any) {
    console.error('[AIEngine] OpenAI personalization failed, falling back to local substitution engine safely:', err.message || err);
    return personalizeFallback(template, invoice, client);
  }
}

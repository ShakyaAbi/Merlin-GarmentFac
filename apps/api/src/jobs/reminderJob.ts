// reminderJob.ts - Scheduled job to send data entry reminders for indicators
import { prisma } from "../prisma";
import { sendReminderEmail } from "../utils/email"; // You must implement this or use your own notification util
import { subDays, addDays, isWithinInterval, isAfter } from "date-fns";

// Helper: get expected reporting periods based on frequency
function getPeriodStart(date: Date, frequency: string): Date {
  const d = new Date(date);
  if (frequency === "MONTHLY") return new Date(d.getFullYear(), d.getMonth(), 1);
  if (frequency === "QUARTERLY") return new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1);
  if (frequency === "WEEKLY") {
    d.setDate(d.getDate() - d.getDay());
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  return d;
}

// Sends data entry reminders for indicators due
export async function runReminderJob() {
  const today = new Date();
  const indicators = await prisma.indicator.findMany({
    where: { reminderEnabled: true },
    include: { submissions: true },
  });

  for (const indicator of indicators) {
    const freq = (indicator.validationConfig as any)?.reportingFrequency || "MONTHLY";
    const dueDate = getPeriodStart(today, freq);
    const hasSubmission = indicator.submissions.some((s: any) => {
      const subDate = getPeriodStart(new Date(s.reportedAt), freq);
      return subDate.getTime() === dueDate.getTime();
    });
    if (hasSubmission) continue;

    // Reminder window
    const daysBefore = indicator.reminderDaysBeforeDue ?? 3;
    const daysAfter = indicator.reminderDaysAfterDue ?? 2;
    const reminderWindow = {
      start: subDays(dueDate, daysBefore),
      end: addDays(dueDate, daysAfter),
    };
    if (!isWithinInterval(today, reminderWindow) && !isAfter(today, reminderWindow.end)) continue;

    // Recipients
    let recipients: string[] = [];
    if (Array.isArray(indicator.reminderRecipients)) {
      recipients = indicator.reminderRecipients as string[];
    }
    // TODO: fallback to project managers if no recipients
    if (recipients.length === 0) continue;

    // Send reminder (implement sendReminderEmail or use your own notification system)
    for (const email of recipients) {
      const subject = `Data Entry Reminder: ${indicator.name}`;
      const text = `Please enter data for indicator "${indicator.name}" for the period starting ${dueDate.toISOString().slice(0,10)}.`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #4CAF50; border-bottom: 2px solid #4CAF50; padding-bottom: 10px;">Merlin Lite Reminder</h2>
          <p style="font-size: 16px; color: #333;">Hello,</p>
          <p style="font-size: 16px; color: #333;">This is a quick reminder that data entry is currently due for the following indicator:</p>
          
          <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #4CAF50; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #2c3e50;">${indicator.name}</h3>
            <p style="margin: 5px 0;"><strong>Reporting Period Starts:</strong> ${dueDate.toLocaleDateString()}</p>
          </div>
          
          <p style="font-size: 16px; color: #333;">Please log in to your dashboard at your earliest convenience to submit your data.</p>
          
          <p style="font-size: 14px; color: #7f8c8d; margin-top: 30px; border-top: 1px solid #e0e0e0; padding-top: 10px;">
            Thank you,<br>
            The Merlin Team
          </p>
        </div>
      `;

      try {
        await sendReminderEmail({
          to: email,
          subject,
          text,
          html,
        });
      } catch (err) {
        // Log and continue sending to remaining recipients/indicators
        console.error(`[ReminderJob] Failed to send reminder to ${email}:`, err);
      }
    }
  }
}

// To run manually (for dev/testing):
if (require.main === module) {
  runReminderJob().then(() => {
    console.log("Reminder job complete");
    process.exit(0);
  });
}

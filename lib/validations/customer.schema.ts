import { z } from "zod";

const emptyToUndefined = z.literal("").transform(() => undefined);

const optionalEmail = z
  .string()
  .trim()
  .email("Enter a valid email")
  .optional()
  .or(emptyToUndefined);

const optionalString = z
  .string()
  .trim()
  .optional()
  .or(emptyToUndefined);

const optionalIsoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format")
  .optional()
  .or(emptyToUndefined);

export const customerSystemSchema = z.object({
  full_name: z.string().trim().min(1, "Full name is required"),
  phone: z.string().trim().min(1, "Phone is required"),
  email: optionalEmail,
  is_student: z.boolean(),
  notes: optionalString,
});

export const customerManualSchema = z.object({
  full_name: z.string().trim().min(1, "Full name is required"),
  phone: optionalString,
  email: optionalEmail,
  is_student: z.boolean(),
  notes: optionalString,
  first_visit: optionalIsoDate,
  last_visit: optionalIsoDate,
  total_visits: z
    .number()
    .int("Must be a whole number")
    .min(0, "Cannot be negative")
    .optional(),
  total_spent: z.number().min(0, "Cannot be negative").optional(),
});

export type CustomerSystemInput = z.infer<typeof customerSystemSchema>;
export type CustomerManualInput = z.infer<typeof customerManualSchema>;

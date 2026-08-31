import { z } from "zod";

/** Supported field kinds for env validation. */
export const FieldKindSchema = z.enum(["string", "url", "enum"]);

export const EnvFieldSchema = z
  .object({
    description: z.string().optional(),
    required: z.boolean().default(true),
    kind: FieldKindSchema.default("string"),
    minLength: z.number().int().nonnegative().optional(),
    enum: z.array(z.string().min(1)).min(1).optional(),
  })
  .superRefine((field, ctx) => {
    if (field.kind === "enum" && (!field.enum || field.enum.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'kind "enum" requires a non-empty "enum" array',
      });
    }
  });

export const EnvSchemaDocument = z.record(
  z
    .string()
    .regex(/^[A-Za-z_][A-Za-z0-9_]*$/, "env key must be a valid identifier"),
  EnvFieldSchema,
);

export type EnvField = z.infer<typeof EnvFieldSchema>;
export type EnvSchema = z.infer<typeof EnvSchemaDocument>;

export function parseEnvSchema(raw: unknown): EnvSchema {
  return EnvSchemaDocument.parse(raw);
}

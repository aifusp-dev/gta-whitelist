import * as z from "zod";

export type OptionDef = { id: string; label: string };

export type ShortTextValidation = { minLength?: number; maxLength?: number; pattern?: string };
export type NumberValidation = { min?: number; max?: number; integer?: boolean };
export type MultiSelectValidation = { minSelected?: number; maxSelected?: number };
export type DateValidation = { minDate?: string; maxDate?: string };
export type CheckboxValidation = { mustBeTrue?: boolean };

export type QuestionValidation =
  | ShortTextValidation
  | NumberValidation
  | MultiSelectValidation
  | DateValidation
  | CheckboxValidation
  | null;

export type QuestionForSchema = {
  id: string;
  type: "SHORT_TEXT" | "LONG_TEXT" | "NUMBER" | "SINGLE_SELECT" | "MULTI_SELECT" | "DATE" | "CHECKBOX";
  required: boolean;
  options: OptionDef[] | null;
  validation: QuestionValidation;
};

function buildQuestionSchema(q: QuestionForSchema): z.ZodTypeAny {
  let schema: z.ZodTypeAny;

  switch (q.type) {
    case "SHORT_TEXT":
    case "LONG_TEXT": {
      let s = z.string({ error: "Este campo es obligatorio." }).trim();
      const v = q.validation as ShortTextValidation | null;
      if (v?.minLength) s = s.min(v.minLength, { error: `Mínimo ${v.minLength} caracteres.` });
      if (v?.maxLength) s = s.max(v.maxLength, { error: `Máximo ${v.maxLength} caracteres.` });
      if (v?.pattern) {
        try {
          s = s.regex(new RegExp(v.pattern), { error: "Formato no válido." });
        } catch {
          // patrón inválido escrito por el admin: se ignora en vez de romper el formulario
        }
      }
      schema = s;
      break;
    }
    case "NUMBER": {
      let n = z.coerce.number({ error: "Debe ser un número." });
      const v = q.validation as NumberValidation | null;
      if (v?.integer) n = n.int({ error: "Debe ser un número entero." });
      if (v?.min !== undefined) n = n.min(v.min, { error: `Mínimo ${v.min}.` });
      if (v?.max !== undefined) n = n.max(v.max, { error: `Máximo ${v.max}.` });
      schema = n;
      break;
    }
    case "SINGLE_SELECT": {
      const ids = (q.options ?? []).map((o) => o.id);
      schema = z.enum(ids.length ? ids : ["__no_options__"], { error: "Selecciona una opción." });
      break;
    }
    case "MULTI_SELECT": {
      const ids = (q.options ?? []).map((o) => o.id);
      const v = q.validation as MultiSelectValidation | null;
      let arr = z.array(z.enum(ids.length ? ids : ["__no_options__"]));
      if (v?.minSelected !== undefined) {
        arr = arr.min(v.minSelected, { error: `Selecciona al menos ${v.minSelected}.` });
      }
      if (v?.maxSelected !== undefined) {
        arr = arr.max(v.maxSelected, { error: `Selecciona como máximo ${v.maxSelected}.` });
      }
      schema = arr;
      break;
    }
    case "DATE": {
      schema = z.iso.date({ error: "Fecha no válida." });
      break;
    }
    case "CHECKBOX": {
      const v = q.validation as CheckboxValidation | null;
      schema = v?.mustBeTrue ? z.literal(true, { error: "Debes confirmar esta casilla." }) : z.boolean();
      break;
    }
  }

  if (!q.required) return schema.optional().nullable();

  // Para texto, exigir no-vacío aunque el admin no haya puesto un minLength propio.
  if (q.type === "SHORT_TEXT" || q.type === "LONG_TEXT") {
    const v = q.validation as ShortTextValidation | null;
    if (!v?.minLength) schema = (schema as z.ZodString).min(1, { error: "Este campo es obligatorio." });
  }

  return schema;
}

export function buildWhitelistAnswersSchema(questions: QuestionForSchema[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const q of questions) shape[q.id] = buildQuestionSchema(q);
  return z.object(shape);
}

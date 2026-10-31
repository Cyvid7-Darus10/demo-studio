import demoSchema from '../../../schemas/demo.schema.json';
import handoffSchema from '../../../schemas/handoff.schema.json';
import { makeValidator } from '../../shared/validate.mjs';
import type { FileKind } from '../lib/types';

const validators: Record<FileKind, (data: unknown) => string[]> = {
  handoff: makeValidator(handoffSchema),
  demo: makeValidator(demoSchema),
};

export function validate(kind: FileKind, data: unknown): string[] {
  return validators[kind](data);
}

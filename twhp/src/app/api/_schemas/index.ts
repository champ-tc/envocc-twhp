// src/app/api/_schemas/index.ts
import { z } from "zod";

export const assessmentSubmissionSchema = z.object({
  // Define fields based on the backend expectations. If not sure, we can keep it generic but structured.
  answers: z.array(z.object({
    questionId: z.string().or(z.number()),
    value: z.any(),
  })).optional(),
});

export const assessmentAnswerSchema = z.object({
  questionId: z.string().or(z.number()),
  value: z.any(),
  evidenceId: z.string().optional(),
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

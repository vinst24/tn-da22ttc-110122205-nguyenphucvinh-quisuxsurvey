import type { RequestHandler } from 'express';
import { surveyService } from '../services/survey.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { created, noContent, ok } from '../utils/response.js';

export const listSurveys: RequestHandler = asyncHandler(async (req, res) => {
  const result = await surveyService.list(req.query);
  const { status, body } = ok(result.items, result.meta);
  res.status(status).json(body);
});

export const getSurveyById: RequestHandler = asyncHandler(async (req, res) => {
  const survey = await surveyService.getById(req.params.id as string);
  const { status, body } = ok(survey);
  res.status(status).json(body);
});

export const getSurveyBySlug: RequestHandler = asyncHandler(async (req, res) => {
  const survey = await surveyService.getBySlug(req.params.slug as string);
  const { status, body } = ok(survey);
  res.status(status).json(body);
});

export const getSurveyForTaking: RequestHandler = asyncHandler(async (req, res) => {
  const survey = await surveyService.getForTaking(req.params.slug as string, req.query.token as string | undefined);
  const { status, body } = ok(survey);
  res.status(status).json(body);
});
export const createSurvey: RequestHandler = asyncHandler(async (req, res) => {
  const survey = await surveyService.create(req.body);
  const { status, body } = created(survey);
  res.status(status).json(body);
});

export const updateSurvey: RequestHandler = asyncHandler(async (req, res) => {
  const survey = await surveyService.update(req.params.id as string, req.body);
  const { status, body } = ok(survey);
  res.status(status).json(body);
});

export const deleteSurvey: RequestHandler = asyncHandler(async (req, res) => {
  await surveyService.delete(req.params.id as string);
  const { status } = noContent();
  res.status(status).end();
});

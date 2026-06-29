import { PATHS } from '../constants/paths';
import type { SurveyDto } from '../types/survey';

export type SurveyStartState = {
  surveyId: string;
  surveySlug?: string;
  surveyTitle: string;
};

export type SurveyStartTarget = {
  path: string;
  state?: SurveyStartState;
};

type SurveyForNav = Pick<SurveyDto, 'id' | 'title' | 'isActive' | 'isPublic' | 'slug'>;

export function getSurveyStartTarget(survey: SurveyForNav): SurveyStartTarget {
  if (!survey.isActive) {
    return { path: PATHS.SURVEY };
  }
  const state: SurveyStartState = {
    surveyId: survey.id,
    surveySlug: survey.slug,
    surveyTitle: survey.title,
  };
  if (survey.isPublic) {
    return { path: PATHS.PARTICIPANT_INFO, state };
  }
  return { path: PATHS.SURVEY_CODE, state };
}

import { Navigate, type RouteObject } from 'react-router';
import { AppShell } from './components/AppShell';
import { checkpointPath, missionPath, missionSummaryPath } from './content/paths';
import { unit1 } from './content/unit1';
import { BossBattlePage } from './pages/BossBattlePage';
import { RootLayout } from './components/RootLayout';
import { CheckpointPage } from './pages/CheckpointPage';
import { DailyPage } from './pages/DailyPage';
import { LessonPage } from './pages/LessonPage';
import { MissionPage } from './pages/MissionPage';
import { MissionSummaryPage } from './pages/MissionSummaryPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { PathPage } from './pages/PathPage';
import { PlaytestPage } from './pages/PlaytestPage';
import { ProfilePage } from './pages/ProfilePage';

// Development only: stripped from production builds along with its placeholder questions.
const devRoutes: RouteObject[] = import.meta.env.DEV
  ? [
      {
        path: 'dev/question-preview',
        lazy: () =>
          import('./pages/QuestionPreviewPage').then((module) => ({ Component: module.default })),
      },
    ]
  : [];

export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <PathPage /> },
          { path: 'daily', element: <DailyPage /> },
          { path: 'profile', element: <ProfilePage /> },
          { path: 'playtest', element: <PlaytestPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
      // Lessons, the checkpoint and the mission are full screen, so learners can focus.
      { path: 'welcome', element: <OnboardingPage /> },
      { path: 'lesson/:lessonId', element: <LessonPage /> },
      { path: 'units/:unitId/checkpoint', element: <CheckpointPage /> },
      { path: 'units/:unitId/boss', element: <BossBattlePage /> },
      { path: 'units/:unitId/mission', element: <MissionPage /> },
      { path: 'units/:unitId/mission/summary', element: <MissionSummaryPage /> },
      // Links from before there were several units point at Unit 1.
      { path: 'checkpoint', element: <Navigate to={checkpointPath(unit1.id)} replace /> },
      { path: 'mission', element: <Navigate to={missionPath(unit1.id)} replace /> },
      {
        path: 'mission/summary',
        element: <Navigate to={missionSummaryPath(unit1.id)} replace />,
      },
      ...devRoutes,
    ],
  },
];

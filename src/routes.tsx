import type { RouteObject } from 'react-router';
import { AppShell } from './components/AppShell';
import { BossBattlePage } from './pages/BossBattlePage';
import { RootLayout } from './components/RootLayout';
import { CheckpointPage } from './pages/CheckpointPage';
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
          { path: 'profile', element: <ProfilePage /> },
          { path: 'playtest', element: <PlaytestPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
      // Lessons, the checkpoint and the mission are full screen, so learners can focus.
      { path: 'welcome', element: <OnboardingPage /> },
      { path: 'lesson/:lessonId', element: <LessonPage /> },
      { path: 'checkpoint', element: <CheckpointPage /> },
      { path: 'units/:unitId/boss', element: <BossBattlePage /> },
      { path: 'mission', element: <MissionPage /> },
      { path: 'mission/summary', element: <MissionSummaryPage /> },
      ...devRoutes,
    ],
  },
];

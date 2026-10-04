import { createLucideIcon } from 'lucide-react';

// Scene icons from the Bats & Boats lookbook (ROADMAP item 36), drawn on lucide's
// 24 px grid. The boats are drawn by SceneBoat since item 73, the fish by SceneFish and
// SceneVisitor since item 85.
// createLucideIcon gives them the same props (size, strokeWidth, className, children).

export const Bat = createLucideIcon('Bat', [
  [
    'path',
    {
      d: 'M12 8.2 13 6.8 13.3 8.6 13.6 9.2 17.5 7 22 10Q20 10.8 19.5 12.5 17.8 11.9 16.5 13.5 14.8 12.2 13.2 13L12 15.5 10.8 13Q9.2 12.2 7.5 13.5 6.2 11.9 4.5 12.5 4 10.8 2 10L6.5 7 10.4 9.2 10.7 8.6 11 6.8Z',
      key: 'wings',
    },
  ],
]);

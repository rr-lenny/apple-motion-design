import React from 'react';
import { Composition } from 'remotion';
import { VIDEO } from './theme';
import { Ikigai, ikigaiDurationInFrames } from './videos/ikigai/Ikigai';

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="Ikigai"
      component={Ikigai}
      durationInFrames={ikigaiDurationInFrames}
      fps={VIDEO.fps}
      width={VIDEO.width}
      height={VIDEO.height}
    />
  </>
);

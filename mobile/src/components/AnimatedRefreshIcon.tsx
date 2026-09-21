import React, { PropsWithChildren, useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

interface AnimatedRefreshIconProps extends PropsWithChildren {
  active: boolean;
}

export const AnimatedRefreshIcon: React.FC<AnimatedRefreshIconProps> = ({ active, children }) => {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      rotation.stopAnimation();
      rotation.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 700,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [active, rotation]);

  const rotate = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return <Animated.View style={{ transform: [{ rotate }] }}>{children}</Animated.View>;
};

export default AnimatedRefreshIcon;

import React, { PropsWithChildren, useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

interface AnimatedListItemProps extends PropsWithChildren {
  index: number;
}

export const AnimatedListItem: React.FC<AnimatedListItemProps> = ({ index, children }) => {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animation = Animated.timing(opacity, {
      toValue: 1,
      duration: 75, // Snappy 75ms list fade
      delay: Math.min(index, 3) * 12, // Tiny stagger only for top items
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });

    animation.start();
    return () => animation.stop();
  }, [index, opacity]);

  return <Animated.View style={{ opacity }}>{children}</Animated.View>;
};

export default AnimatedListItem;

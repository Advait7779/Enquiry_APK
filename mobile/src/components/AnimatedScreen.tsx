import React, { PropsWithChildren, useEffect, useRef } from 'react';
import { Animated, Easing, StyleProp, ViewStyle } from 'react-native';

interface AnimatedScreenProps extends PropsWithChildren {
  style?: StyleProp<ViewStyle>;
}

export const AnimatedScreen: React.FC<AnimatedScreenProps> = ({ children, style }) => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.timing(opacity, {
      toValue: 1,
      duration: 80, // Fast 80ms micro-entrance on mount only
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });

    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View style={[style, { opacity, flex: 1 }]}>
      {children}
    </Animated.View>
  );
};

export default AnimatedScreen;

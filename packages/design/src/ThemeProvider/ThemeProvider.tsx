import * as React from 'react';
import { ThemeProvider, ColorModeProvider, CSSReset } from '@chakra-ui/react';
import theme from '../theme';

export default function Theme({ children }: Props) {
  return (
    <ThemeProvider theme={theme.chakra}>
      <ColorModeProvider>
        <CSSReset />
        {children}
      </ColorModeProvider>
    </ThemeProvider>
  );
}

export type Props = {
  children: React.ReactNode;
};

import { extendTheme } from '@chakra-ui/react';
import { mode } from '@chakra-ui/theme-tools';
import { colors } from './palette';
import { fonts } from './fonts';

const theme = {
  colors,
  fonts,
  chakra: extendTheme({
    config: {
      initialColorMode: 'dark',
      useSystemColorMode: true,
    },
    colors,
    components: {
      Button: {
        variants: {
          solid: (props: { colorScheme: string }) => {
            const { colorScheme: c } = props;
            if (c !== 'brand') return {};

            return {
              bg: `${c}.500`,
              color: 'gray.900',
            };
          },
        },
      },
      Input: {
        variants: {
          outline: (props: { colorScheme: string }) => {
            const { colorScheme: c } = props;
            if (c !== 'brand') return {};

            return {
              field: {
                borderColor: `${c}.500`,
                _hover: {
                  borderColor: mode(`${c}.600`, `${c}.300`)(props),
                },
              },
            };
          },
          filled: (props: { colorScheme: string }) => {
            const { colorScheme: c } = props;
            if (c !== 'brand') return {};

            return {
              field: {
                background: `${c}.500`,
              },
            };
          },
        },
      },
    },
    defaultProps: {
      colorScheme: 'brand',
    },
  }),
};

export default theme;

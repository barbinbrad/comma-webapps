import { extendTheme } from '@chakra-ui/react';
import { mode } from '@chakra-ui/theme-tools';

const colors = {
  brand: {
    50: '#86fb8f',
    100: '#70ff7b',
    200: '#4bfb58',
    300: '#32f941',
    400: '#1eff2f',
    500: '#00ff15',
    600: '#00d912',
    700: '#00b70f',
    800: '#009f0d',
    900: '#01770a',
  },
};

const theme = extendTheme({
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
});

export default theme;

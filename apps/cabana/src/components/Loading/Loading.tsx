import { Center, Spinner, useColorMode } from '@chakra-ui/react';

export default function Loading() {
  const { colorMode } = useColorMode();
  const emptyColor = colorMode !== 'dark' ? 'gray.200' : 'whiteAlpha.300';

  return (
    <Center h="full">
      <Spinner thickness="4px" speed="1s" emptyColor={emptyColor} color="brand.500" size="xl" />
    </Center>
  );
}

import { Center, Spinner } from '@chakra-ui/react';

export default function Loading({ emptyColor }: Props) {
  return (
    <Center h="full">
      <Spinner thickness="4px" speed="1s" emptyColor={emptyColor} color="brand.500" size="xl" />
    </Center>
  );
}

type Props = {
  emptyColor: string;
};

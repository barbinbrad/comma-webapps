import {
  AspectRatio,
  Button,
  Center,
  Input,
  Image,
  Flex,
  HStack,
  VStack,
  Spinner,
} from '@chakra-ui/react';
import { FaRegEdit } from 'react-icons/fa';
import useCabana from './useCabana';

import Navigation from '../components/Navigation';
import { Props } from './types';
import snapshot from '../data/snapshot.jpg';

export default function Container(props: Props) {
  const state = useCabana(props);
  return <Cabana {...state} />;
}

function Cabana(props: ReturnType<typeof useCabana>) {
  const { borderColor } = props;

  return (
    <VStack h="100vh" w="100vw" spacing={0}>
      <Flex as="nav" w="full">
        <Navigation />
      </Flex>
      <Flex h="full">
        <HStack w="100vw" spacing={0}>
          <Flex
            as="aside"
            direction="column"
            h="full"
            w="full"
            maxWidth={410}
            borderRightColor={borderColor}
            borderRightWidth={1}
            overflow="scroll"
          >
            <Input
              size="sm"
              borderRadius={0}
              borderTopWidth={0}
              borderLeftWidth={0}
              borderRightWidth={0}
              borderBottomWidth={1}
              borderColor={borderColor}
              placeholder="Search"
            />
            <Center h="full">
              <Spinner
                thickness="4px"
                speed="1s"
                emptyColor={borderColor}
                color="brand.500"
                size="xl"
              />
            </Center>
          </Flex>
          <Flex
            as="main"
            h="full"
            w="full"
            direction="column"
            borderRightColor={borderColor}
            borderRightWidth={1}
            boxShadow="lg"
            p={3}
            overflow="scroll"
          >
            <Button
              size="xs"
              py={4}
              variant="solid"
              textAlign="start"
              w="full"
              leftIcon={<FaRegEdit />}
            >
              STEER_ANGLE_SENSOR
            </Button>
          </Flex>
          <Flex as="aside" h="full" w="full" overflow="scroll">
            <AspectRatio w="full" maxHeight="full" ratio={4 / 3}>
              <Image src={snapshot} />
            </AspectRatio>
          </Flex>
        </HStack>
      </Flex>
    </VStack>
  );
}

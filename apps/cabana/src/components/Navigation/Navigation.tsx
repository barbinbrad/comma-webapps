import {
  chakra,
  Box,
  Flex,
  Button,
  IconButton,
  CloseButton,
  Tooltip,
  HStack,
  VStack,
  VisuallyHidden,
  useColorModeValue,
  useColorMode,
  useDisclosure,
} from '@chakra-ui/react';

import { AiOutlineMenu, AiOutlineInbox } from 'react-icons/ai';
import { BsCloudDownload, BsCloudUpload, BsGithub, BsSpeedometer } from 'react-icons/bs';
import { MdBrightnessLow, MdOutlineBrightness2 } from 'react-icons/md';
import { FaDiscord } from 'react-icons/fa';
import { Logo } from 'design';

export default function Navigation() {
  const { colorMode, toggleColorMode } = useColorMode();
  const bg = useColorModeValue('white', 'black');
  const mobileNav = useDisclosure();

  return (
    <chakra.header bg={bg} w="full" px={{ base: 2, sm: 4 }} py={4} shadow="md">
      <Flex alignItems="center" justifyContent="space-between" mx="auto">
        <HStack display="flex" spacing={3} alignItems="center">
          <chakra.a href="/" title="Cabana" display="flex" alignItems="center">
            <Logo />
            <VisuallyHidden>Cabana</VisuallyHidden>
          </chakra.a>

          <Box display={{ base: 'inline-flex', md: 'none' }} zIndex={999}>
            <IconButton
              display={{ base: 'flex', md: 'none' }}
              aria-label="Open menu"
              fontSize="20px"
              color={useColorModeValue('gray.800', 'inherit')}
              variant="ghost"
              icon={<AiOutlineMenu />}
              onClick={mobileNav.onOpen}
            />
            <VStack
              pos="absolute"
              top={0}
              left={0}
              right={0}
              display={mobileNav.isOpen ? 'flex' : 'none'}
              flexDirection="column"
              p={2}
              pb={4}
              m={2}
              bg={bg}
              spacing={3}
              rounded="sm"
              shadow="sm"
            >
              <CloseButton
                aria-label="Close menu"
                justifySelf="self-start"
                onClick={mobileNav.onClose}
              />
              <Button w="full" variant="ghost" leftIcon={<BsCloudUpload />}>
                Load DBC
              </Button>
              <Button w="full" variant="solid" colorScheme="brand" leftIcon={<BsCloudDownload />}>
                Save DBC
              </Button>
              <Button w="full" variant="ghost" leftIcon={<AiOutlineInbox />}>
                Save Log
              </Button>
            </VStack>
          </Box>

          <HStack spacing={2} display={{ base: 'none', md: 'inline-flex' }}>
            <Button variant="ghost" leftIcon={<BsCloudUpload />} size="sm">
              Load DBC
            </Button>
            <Button variant="solid" colorScheme="brand" leftIcon={<BsCloudDownload />} size="sm">
              Save DBC
            </Button>
            <Button variant="ghost" leftIcon={<AiOutlineInbox />} size="sm">
              Save Log
            </Button>
          </HStack>
        </HStack>
        <HStack spacing={3} display={mobileNav.isOpen ? 'none' : 'flex'} alignItems="center">
          <Tooltip label="Discord">
            <chakra.a
              href="https://discord.com/channels/469524606043160576/932379632261562368"
              title="Discord"
            >
              <IconButton aria-label="Discord" onClick={toggleColorMode} icon={<FaDiscord />} />
            </chakra.a>
          </Tooltip>
          <Tooltip label="GitHub">
            <chakra.a href="https://github.com/commaai" title="GitHub">
              <IconButton aria-label="GitHub" onClick={toggleColorMode} icon={<BsGithub />} />
            </chakra.a>
          </Tooltip>
          <Tooltip label={colorMode !== 'dark' ? 'Dark Mode' : 'Light Mode'}>
            <IconButton
              aria-label="Toggle Dark Mode"
              onClick={toggleColorMode}
              icon={colorMode !== 'dark' ? <MdOutlineBrightness2 /> : <MdBrightnessLow />}
            />
          </Tooltip>
          <Tooltip label="Play Speed">
            <IconButton aria-label="Play Speed" icon={<BsSpeedometer />} />
          </Tooltip>
          <Button colorScheme="brand" leftIcon={<BsGithub />}>
            Login
          </Button>
        </HStack>
      </Flex>
    </chakra.header>
  );
}

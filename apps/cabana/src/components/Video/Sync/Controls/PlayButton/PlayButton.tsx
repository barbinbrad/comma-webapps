import { useCallback } from 'react';
import { IconButton } from '@chakra-ui/react';
import { FaPause, FaPlay } from 'react-icons/fa';

export default function PlayButton({ isPlaying, onPause, onPlay }: Props) {
  const handleClick = useCallback(() => {
    if (isPlaying) {
      onPause();
    } else {
      onPlay();
    }
  }, [isPlaying]);

  return (
    <IconButton
      aria-label="play"
      borderRadius="100%"
      boxShadow="md"
      colorScheme="brand"
      icon={isPlaying ? <FaPause /> : <FaPlay />}
      marginLeft={2}
      marginRight={-1}
      onClick={handleClick}
    />
  );
}

type Props = {
  isPlaying: boolean;
  onPause: () => void;
  onPlay: () => void;
};

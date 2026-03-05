import React, { useState } from 'react';
import { Box } from '@mantine/core';
import { IconReceipt2 } from '@tabler/icons-react';

export type ThumbImgProps = Readonly<{
  src?: string;
  size?: number;
  alt?: string;
}>;

export function ThumbImg(props: ThumbImgProps) {
  const { src, size = 28, alt = '' } = props;
  const [errored, setErrored] = useState(false);

  const hasSrc = !!src && src.trim() !== '';
  const style: React.CSSProperties = { width: size, height: size, borderRadius: 4 };

  if (!hasSrc || errored) {
    return (
      <Box
        style={{
          ...style,
          background: '#f3f4f6',
          border: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <IconReceipt2 size={Math.max(14, Math.floor(size * 0.6))} color="#9aa0a6" />
      </Box>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      style={style}
      onError={() => setErrored(true)}
    />
  );
}


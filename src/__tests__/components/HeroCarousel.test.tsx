import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';

import { HeroCarousel } from '../../../components/HeroCarousel';

const slides = [
  { image: '/slide1.png', title: 'Slide One' },
  { image: '/slide2.png', title: 'Slide Two' },
  { image: '/slide3.png', title: 'Slide Three' },
];

describe('HeroCarousel', () => {
  it('renders first slide title', () => {
    render(<HeroCarousel slides={slides} />);
    expect(screen.getByText('Slide One')).toBeInTheDocument();
  });

  it('renders all slide images', () => {
    render(<HeroCarousel slides={slides} />);
    expect(screen.getAllByRole('img')).toHaveLength(3);
  });

  it('navigates to next slide on next button click', async () => {
    render(<HeroCarousel slides={slides} />);
    const nextBtn = screen.getByLabelText(/go to next slide/i);
    await userEvent.click(nextBtn);
    // Second slide should now be visible (opacity-100)
    const imgs = screen.getAllByRole('img');
    const slide2Container = imgs[1].closest('div[class*="transition-opacity"]');
    expect(slide2Container?.className).toContain('opacity-100');
  });

  it('navigates to previous slide on prev button click', async () => {
    render(<HeroCarousel slides={slides} />);
    const prevBtn = screen.getByLabelText(/go to previous slide/i);
    await userEvent.click(prevBtn);
    // Should wrap to last slide
    const imgs = screen.getAllByRole('img');
    const slide3Container = imgs[2].closest('div[class*="transition-opacity"]');
    expect(slide3Container?.className).toContain('opacity-100');
  });

  it('renders dot indicators for each slide', () => {
    render(<HeroCarousel slides={slides} />);
    expect(screen.getByLabelText('Go to slide 1 of 3')).toBeInTheDocument();
    expect(screen.getByLabelText('Go to slide 2 of 3')).toBeInTheDocument();
    expect(screen.getByLabelText('Go to slide 3 of 3')).toBeInTheDocument();
  });

  it('renders a <video> overlay for a slide that has a video, keeping the image poster', () => {
    const videoSlides = [
      { image: '/poster1.png', title: 'Video Slide', video: 'https://cdn.b-cdn.net/hero/loop.mp4' },
      { image: '/slide2.png', title: 'Image Slide' },
    ];
    const { container } = render(<HeroCarousel slides={videoSlides} />);
    const video = container.querySelector('video');
    expect(video).not.toBeNull();
    expect(video?.getAttribute('src')).toBe('https://cdn.b-cdn.net/hero/loop.mp4');
    expect(video?.getAttribute('poster')).toBe('/poster1.png');
    // The image-only slide contributes no video; both posters/images still render.
    expect(container.querySelectorAll('video')).toHaveLength(1);
    expect(screen.getAllByRole('img')).toHaveLength(2);
  });
});

import React from "react";
import CustomCard from "../specific/Card";
import img1 from '../../assets/images/2.jpg';
import img2 from '../../assets/images/3.jpg';
import img3 from '../../assets/images/4.jpg';
import Grid from '@mui/material/Grid';

export default function News() {
  const cardsData = [
    {
      title: 'News for now',
      content: 'Lorem ipsum dolor sit, amet consectetur adipisicing elit. Assumenda nulla inventore omnis official',
      imageTitle: 'Lizard News',
      image: img1,
    },
    {
      title: 'Latest Updates',
      content: 'Stay updated with the latest happenings around the world.',
      imageTitle: 'World News',
      image: img2,
    },
    {
      title: 'Technology Insights',
      content: 'Discover the latest trends and technologies in the tech world.',
      imageTitle: 'Tech News',
      image: img3,
    }
  ];

  return (
    <Grid container spacing={2}>
      {cardsData.map((card, index) => (
        <Grid item xs={12} sm={6} md={4} key={index}>
          <CustomCard 
            title={card.title} 
            content={card.content}
            imageTitle={card.imageTitle} 
            image={card.image}
          />
        </Grid>
      ))}
    </Grid>
  );
}

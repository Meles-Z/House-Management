import * as React from "react";
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import img1 from '../assets/images/2.jpg';
import img2 from '../assets/images/3.jpg';
import img3 from '../assets/images/4.jpg';
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import News from "../components/layout/News";
import { Grid } from "@mui/material";
import CustomCard from "../components/specific/Card";

export default function Home() {
  const bull=(
    <Box
    component="span"
    sx={{display:'inline-block', mx:'2px',transform: 'scale(0.8)'}}
    >
     •
    </Box>

  )
  const cardData=[
    {
      title:'Luxury Villa',
      content:'Discover the epitome of luxury in this stunning villa, offering unparalleled views and top-notch amenities.',
      imageTitle:'Luxry',
      image:img1
    },
    {
      title:'Luxury Villa',
      content:'Discover the epitome of luxury in this stunning villa, offering unparalleled views and top-notch amenities.',
      imageTitle:'Luxry',
      image:img2,
    },
    {
      title:'Luxury Villa',
      content:'Discover the epitome of luxury in this stunning villa, offering unparalleled views and top-notch amenities.',
      imageTitle:'Luxry',
      image:img3,
    },
  
  ]
  const card = (
    <React.Fragment>
      <CardContent>
        <Typography sx={{ fontSize: 14 }} color="text.secondary" gutterBottom>
          Word of the Day
        </Typography>
        <Typography variant="h5" component="div">
          be{bull}nev{bull}o{bull}lent
        </Typography>
        <Typography sx={{ mb: 1.5 }} color="text.secondary">
          adjective
        </Typography>
        <Typography variant="body2">
          well meaning and kindly.
          <br />
          {'"a benevolent smile"'}
        </Typography>
      </CardContent>
      <CardActions>
        <Button size="small">Learn More</Button>
      </CardActions>
    </React.Fragment>
  );
  return (
    <>
      <Header />
      <main className="bg-[url('./assets/images/land2.jpg')] bg-cover h-screen text-white py-24">
        <div className="container mx-auto flex flex-col items-center justify-center">
          <h2 className="text-5xl font-bold mb-4">
            Sell or rent your home at the best price
          </h2>
          <p className="text-lg mb-8">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fusce varius justo
            et scelerisque varius.
          </p>
          <div className="flex space-x-4">
            <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
              Sale
            </button>
            <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
              Rent
            </button>
          </div>
          <div className="mt-16">
            <div className="flex items-center justify-center space-x-4">
              <div className="flex items-center">
                <input
                  type="search"
                  placeholder="Search by location or Property ID.."
                  className="bg-gray-200 py-2 px-4 rounded"
                />
              </div>
              <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                Search
              </button>
            </div>
          </div>
        </div>
      </main>
      <h1 className="text-5xl font-bold mb-4 text-center mt-12">Explore Our Properties</h1>
      <div className="container mx-auto flex items-center justify-center mt-12 space-x-4">
       <Grid container spacing={2}>
       {cardData.map((card, index)=>(
        <Grid item sx={12} sm={6} md={4} key={index}>
          <CustomCard 
          title={card.title}
          content={card.content}
          imageTitle={card.imageTitle}
          image={card.image}
          />
        </Grid>
        
       ))}
       </Grid>
       
      </div>
      <h1 className="text-5xl font-bold mb-4 text-center mt-12">Our Mession to Contact the Buyer and Seller</h1>
      <div className="container mx-auto flex items-center justify-center mt-12 space-x-4 mb-5">
      <Box sx={{ minWidth: 275 }}>
        <Card variant="outlined">{card}</Card>
      </Box>

      <Box sx={{ minWidth: 275 }}>
        <Card variant="outlined">{card}</Card>
      </Box>

      <Box sx={{ minWidth: 275 }}>
        <Card variant="outlined">{card}</Card>
      </Box>
      <Box sx={{ minWidth: 275 }}>
        <Card variant="outlined">{card}</Card>
      </Box>
      </div>
      <h1 className="text-5xl font-bold mb-4 text-center mt-12">News</h1>
      <div className="container mx-auto flex items-center justify-center mt-12 space-x-4 mb-5">
        <News/>
      </div>
      <Footer/>
    </>
  );
}

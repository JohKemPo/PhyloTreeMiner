import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import { Carousel } from "antd";

import bg1 from "../../assets/screen_1.png";
import bg2 from "../../assets/screen_2.png";
import bg3 from "../../assets/screen_3.png";
import bg4 from "../../assets/screen_4.png";
import bg5 from "../../assets/screen_5.png";
import bg6 from "../../assets/screen_6.png";
import bg7 from "../../assets/screen_7.png";
import bg8 from "../../assets/screen_8.png";
import bg9 from "../../assets/screen_9.png";
import bg10 from "../../assets/screen_10.png";
// import bg11 from "../../assets/screen_11.png";
import bg12 from "../../assets/screen_12.png";
import bg13 from "../../assets/screen_13.png";
import bg14 from "../../assets/screen_14.png";

const carouselItems = [
  { image: bg1 },
  { image: bg2 },
  { image: bg3 },
  { image: bg4 },
  { image: bg5 },
  // { image: bg6 },
  { image: bg7 },
  // { image: bg8 },
  // { image: bg9 },
  { image: bg10 },
  // { image: bg11 },
  { image: bg12 },
  { image: bg13 },
  { image: bg14 },
];

const Features = () => (
  <Box
    id="sobre"
    sx={{
      backgroundColor: "#1A2530FF",
      width: "100%",
    }}
  >
    <Container
      sx={{
        py: { xs: 8, sm: 16 },
        backgroundColor: "#1A2530FF",
        width: "100vw",
      }}
    >
      <Grid container spacing={6}>
        <Grid item xs={12} md={6}>
          <div>
            <Typography component="h2" variant="h4" color="white">
              Features
            </Typography>
            <Typography
              variant="body1"
              color="white"
              sx={{ mb: { xs: 2, sm: 4 } }}
            >
              Designed to be powerful for professionals and accessible for
              beginners, here's a summary of how our platform can boost your
              research.
            </Typography>
          </div>
          <Stack direction="column" spacing={2}>
            <Grid item container spacing={1}>
              <CheckCircleRoundedIcon sx={{ color: "white", mr: 1 }} />
              <Typography variant="body1" color="white">
                Real-time progress tracking.
              </Typography>
            </Grid>
            <Grid item container spacing={1}>
              <CheckCircleRoundedIcon sx={{ color: "white", mr: 1 }} />
              <Typography variant="body1" color="white">
                Analysis of workflows already executed.
              </Typography>
            </Grid>
            <Grid item container spacing={1}>
              <CheckCircleRoundedIcon sx={{ color: "white", mr: 1 }} />
              <Typography variant="body1" color="white">
                Generation of phylogenetic evaluation metrics.
              </Typography>
            </Grid>
            <Grid item container spacing={1}>
              <CheckCircleRoundedIcon sx={{ color: "white", mr: 1 }} />
              <Typography variant="body1" color="white">
                Easily control and manage your analyses visually — no coding
                required.
              </Typography>
            </Grid>
            <Grid item container spacing={1}>
              <CheckCircleRoundedIcon sx={{ color: "white", mr: 1 }} />
              <Typography variant="body1" color="white">
                Multi methods 
              </Typography>
            </Grid>
            <Grid item container spacing={1}>
              <CheckCircleRoundedIcon sx={{ color: "white", mr: 1 }} />
              <Typography variant="body1" color="white">
                Analysis ( Geo, Timeline, Topography )
              </Typography>
            </Grid>
            
          </Stack>
        </Grid>
        <Grid
          item
          xs={12}
          md={6}
          sx={{ display: { xs: "none", sm: "flex" }, width: "100%" }}
        >
          <Card
            variant="outlined"
            sx={{
              backgroundColor: "#FFFFFF00",
              height: "100%",
              width: "100%",
              minHeight: 600,
              pointerEvents: "none",
              overflow: "hidden",
            }}
          >
            <Carousel
              autoplay={{ dotDuration: true }}
              arrows
              effect="fade"
              autoplaySpeed={5000}
            >
              {carouselItems.map((item, index) => (
                <div key={index} style={{ height: "160px" }}>
                  <Box
                    sx={{
                      width: "100%",
                      height: "615px",
                      backgroundSize: "contain",
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "center",
                      backgroundImage: `url(${item.image})`,
                    }}
                  />
                </div>
              ))}
            </Carousel>
          </Card>
        </Grid>
      </Grid>
    </Container>
  </Box>
);

export default Features;

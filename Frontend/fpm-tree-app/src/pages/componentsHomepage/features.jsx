import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';

import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';


import bg2 from '../../assets/bg2.png'


const Features = () => (
    <Box
        id="sobre"
        sx={{
            backgroundColor: '#1A2530FF',
            width: '100%' // ou 100vw, mas 100% é geralmente mais seguro
        }}
    >
        <Container sx={{ py: { xs: 8, sm: 16 }, backgroundColor: '#1A2530FF', width: '100vw' }}>
            <Grid container spacing={6}>
                <Grid item xs={12} md={6}>
                    <div>
                        <Typography component="h2" variant="h4" color="white">
                            Features
                        </Typography>
                        <Typography variant="body1" color="white" sx={{ mb: { xs: 2, sm: 4 } }}>
                            Designed to be powerful for professionals and accessible for beginners, here's a summary of how our platform can transform your research.
                        </Typography>
                    </div>
                    <Stack direction="column" spacing={2}>
                        <Grid item container spacing={1}>
                            <CheckCircleRoundedIcon sx={{ color: 'white', mr: 1 }} />
                            <Typography variant="body1" color='white'>Real-time progress tracking.</Typography>
                        </Grid>
                        <Grid item container spacing={1}>
                            <CheckCircleRoundedIcon sx={{ color: 'white', mr: 1 }} />
                            <Typography variant="body1" color='white'>Analysis of workflows already executed.</Typography>
                        </Grid>
                        <Grid item container spacing={1}>
                            <CheckCircleRoundedIcon sx={{ color: 'white', mr: 1 }} />
                            <Typography variant="body1" color='white'>Generation of phylogenetic evaluation metrics.</Typography>
                        </Grid>
                    </Stack>
                </Grid>
                <Grid item xs={12} md={6} gap={2} sx={{ display: { xs: 'none', sm: 'flex' }, width: '100%' }}>
                    <Card variant="outlined" sx={{ height: '100%', width: '100%', minHeight: 600, pointerEvents: 'none' }}>
                        <Box
                            sx={{
                                m: 'auto',
                                width: '100%',
                                height: '100%',
                                backgroundSize: 'contain',
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'center',
                                backgroundImage: `url(${bg2})`,
                            }}
                        />
                    </Card>
                    
                </Grid>
            </Grid>
        </Container>
    </Box>
);

export default Features;
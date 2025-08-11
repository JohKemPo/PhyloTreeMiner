import * as React from 'react';

import {
    ThemeProvider,
    createTheme,
    alpha
} from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import AppBar from '@mui/material/AppBar';
import Container from '@mui/material/Container';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import TextField from '@mui/material/TextField';
import { useNavigate } from 'react-router-dom';

import {

    Link,

} from '@mui/material';

// Ícones
import GitHubIcon from '@mui/icons-material/GitHub';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import ScienceIcon from '@mui/icons-material/Science';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const Highlights = () => (
    <Box
        id="highlights"
        sx={{
            // pt: { xs: 4, sm: 12 },
            pb: { xs: 8, sm: 16 },
            color: 'white',
            // bgcolor: '#06090E',
        }}
    >
        <Container
            sx={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: { xs: 3, sm: 6 },
            }}
        >
            <Box sx={{ width: { sm: '100%', md: '60%' }, textAlign: { sm: 'left', md: 'center' } }}>
                <Typography component="h2" variant="h4" sx={{ color: 'grey.800', fontWeight: 'bold' }}>
                    Workflow Highlights
                </Typography>
                <Typography variant="body1" sx={{ color: 'grey.500' }}>
                    Explore the key features that make PhyloTreeMiner the ideal tool for your analyses, from beginners to experts.
                </Typography>
            </Box>
            <Grid container rowSpacing={{ xs: 1, sm: 2, md: 3 }} columnSpacing={{ xs: 1, sm: 2, md: 3 }}>
                <Grid item size={{ xs: 2, sm: 4, md: 4 }}>
                    <Stack
                        direction="column"
                        color="inherit"
                        spacing={1}
                        useFlexGap
                        sx={{ p: 4, height: '100%', border: '1px solid #E4E4E4FF', borderRadius: 2 }}

                    >
                        <Box sx={{ color: 'grey.800' }}><AnalyticsIcon /></Box>
                        <div>
                            <Typography fontWeight="bold" gutterBottom sx={{ color: 'grey.800' }}>
                                Visual Insights with Neo4j
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'grey.800' }} align="justify">
                                Integration with Neo4j facilitates graph visualization, revealing deep biological insights.
                            </Typography>
                        </div>
                    </Stack>
                </Grid>
                <Grid item size={{ xs: 2, sm: 4, md: 4 }}>
                    <Stack
                        direction="column"
                        color="inherit"
                        spacing={1}
                        useFlexGap
                        sx={{ p: 4, height: '100%', border: '1px solid #E4E4E4FF', borderRadius: 2 }}

                    >
                        <Box sx={{ color: 'grey.800' }}><AnalyticsIcon /></Box>
                        <div>
                            <Typography fontWeight="bold" gutterBottom sx={{ color: 'grey.800' }}>
                                Visual Insights with Neo4j
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'grey.800' }} align="justify">
                                Integration with Neo4j facilitates graph visualization, revealing deep biological insights.
                            </Typography>
                        </div>
                    </Stack>
                </Grid>
                <Grid item size={{ xs: 2, sm: 4, md: 4 }}>
                    <Stack
                        direction="column"
                        color="inherit"
                        spacing={1}
                        useFlexGap
                        sx={{ p: 4, height: '100%', border: '1px solid #E4E4E4FF', borderRadius: 2 }}

                    >
                        <Box sx={{ color: 'grey.800' }}><AnalyticsIcon /></Box>
                        <div>
                            <Typography fontWeight="bold" gutterBottom sx={{ color: 'grey.800' }}>
                                Visual Insights with Neo4j
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'grey.800' }} align="justify">
                                Integration with Neo4j facilitates graph visualization, revealing deep biological insights.
                            </Typography>
                        </div>
                    </Stack>
                </Grid>
                <Grid item size={{ xs: 2, sm: 4, md: 4 }}>
                    <Stack
                        direction="column"
                        color="inherit"
                        spacing={1}
                        useFlexGap
                        sx={{ p: 4, height: '100%', border: '1px solid #E4E4E4FF', borderRadius: 2 }}

                    >
                        <Box sx={{ color: 'grey.800' }}><AnalyticsIcon /></Box>
                        <div>
                            <Typography fontWeight="bold" gutterBottom sx={{ color: 'grey.800' }}>
                                Visual Insights with Neo4j
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'grey.800' }} align="justify">
                                Integration with Neo4j facilitates graph visualization, revealing deep biological insights.
                            </Typography>
                        </div>
                    </Stack>
                </Grid>
                <Grid item size={{ xs: 2, sm: 4, md: 4 }}>
                    <Stack
                        direction="column"
                        color="inherit"
                        spacing={1}
                        useFlexGap
                        sx={{ p: 4, height: '100%', border: '1px solid #E4E4E4FF', borderRadius: 2 }}
                    >
                        <Box sx={{ color: 'grey.800' }}><AnalyticsIcon /></Box>
                        <div>
                            <Typography fontWeight="bold" gutterBottom sx={{ color: 'grey.800' }}>
                                Visual Insights with Neo4j
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'grey.800' }} align="justify">
                                Integration with Neo4j facilitates graph visualization, revealing deep biological insights.
                            </Typography>
                        </div>
                    </Stack>
                </Grid>
                <Grid item size={{ xs: 2, sm: 4, md: 4 }}>
                    <Stack
                        direction="column"
                        color="inherit"
                        spacing={1}
                        useFlexGap
                        sx={{ p: 4, height: '100%', border: '1px solid #E4E4E4FF', borderRadius: 2 }}
                    >
                        <Box sx={{ color: 'grey.800' }}><AnalyticsIcon /></Box>
                        <div>
                            <Typography fontWeight="bold" gutterBottom sx={{ color: 'grey.800' }}>
                                Visual Insights with Neo4j
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'grey.800' }} align="justify">
                                Integration with Neo4j facilitates graph visualization, revealing deep biological insights.
                            </Typography>
                        </div>
                    </Stack>
                </Grid>
            </Grid>
        </Container>
    </Box>
);

export default Highlights;
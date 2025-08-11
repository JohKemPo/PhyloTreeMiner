import {

    alpha
} from '@mui/material/styles';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { useNavigate } from 'react-router-dom';

import bg from '../../assets/bg.png'


import GitHubIcon from '@mui/icons-material/GitHub';

const Hero = () => {
    const navigate = useNavigate();

    const handleStartWorking = () => {
        navigate('/Dashboards');
    };

    return (
        <Box
            id="hero"
            sx={(theme) => ({
                width: '100%',
                backgroundImage:
                    theme.palette.mode === 'light'
                        ? 'linear-gradient(180deg, #CEE5FD, #FFF)'
                        : `linear-gradient(#02294F, ${alpha('#090E10', 0.0)})`,
                backgroundSize: '100% 20%',
                backgroundRepeat: 'no-repeat',
            })}
        >
            <Container
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    pt: { xs: 14, sm: 20 },
                    pb: { xs: 8, sm: 12 },
                }}
            >
                <Stack spacing={2} useFlexGap>
                    <Typography
                        component="h1"
                        variant="h1"
                        sx={{
                            display: 'flex',
                            flexDirection: { xs: 'column', md: 'row' },
                            alignSelf: 'center',
                            textAlign: 'center',
                            fontSize: 'clamp(3.5rem, 10vw, 4rem)',
                        }}
                    >
                        Simplifying Complex Phylogenetic Analysis
                        {/* <Typography
                            component="span"
                            variant="h1"
                            sx={{
                                fontSize: 'clamp(3.5rem, 10vw, 4rem)',
                                color: (theme) =>
                                    theme.palette.mode === 'light' ? 'primary.main' : 'primary.light',
                            }}
                        >
                            Filogenética
                        </Typography> */}
                    </Typography>
                    <Typography variant="body1" textAlign="center" color="text.secondary">
                        A powerful e-science tool designed to orchestrate, execute, and visualize end-to-end phylogenetic analysis workflows.
                    </Typography>
                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={4}
                        alignSelf="center"
                        sx={{ pt: 2, width: { xs: '100%', sm: 'auto' } }}
                    >
                        <Button variant="contained" color="primary" onClick={handleStartWorking}>
                            Start working
                        </Button>
                        <Button variant="outlined" color="primary" href='https://github.com/UFFeScience/NMFSt.P' target="_blank" startIcon={<GitHubIcon/>}>
                            Documentation
                        </Button>
                    </Stack>
                </Stack>
                <Box
                    id="image"
                    sx={(theme) => ({
                        mt: { xs: 8, sm: 10 },
                        alignSelf: 'center',
                        height: { xs: 200, sm: 400, md: 500 },
                        width: '100%',
                        backgroundImage: `url(${bg})`,
                        backgroundSize: 'cover',
                        borderRadius: '10px',
                        outline: '1px solid',
                        outlineColor:
                            theme.palette.mode === 'light'
                                ? alpha('#BFCCD9', 0.5)
                                : alpha('#909090', 0.2),
                        boxShadow:
                            theme.palette.mode === 'light'
                                ? `0 0 12px 8px ${alpha('#9CCCFC', 0.2)}`
                                : `0 0 24px 12px ${alpha('#033363', 0.2)}`,
                    })}
                />
            </Container>
        </Box>
    );
};

export default Hero;
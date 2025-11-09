import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';

import GitHubIcon from '@mui/icons-material/GitHub';
import { Button } from 'antd';


const FooterComponent = () => (
    <Container
        sx={{
            py: { xs: 6, sm: 8 },
        }}
    >
        <Box
            sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { xs: 'center', sm: 'flex-start' },
                justifyContent: 'space-between',
                borderColor: 'divider',
            }}
        >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                    PhyloTreeMiner
                </Typography>


            </Box>


        </Box>
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'space-between',
                width: '100%',
                borderColor: 'divider',

            }}
        >
            <div>
                <Typography variant="body2" color="text.secondary">
                    Copyright {new Date().getFullYear()} - UFFeScience
                </Typography>
            </div>
            <Stack direction="column" spacing={1} useFlexGap>




                <a href="https://www.ic.uff.br/" target="_blank">Computer Science Research Institute - UFF</a>
                <a href="https://github.com/UFFeScience" target="_blank">PhyloTreeMiner - GitHub</a>
                <a href="https://github.com/UFFeScience" target="_blank">UFFeScience</a>
            </Stack>


        </Box>
    </Container>
);

export default FooterComponent;
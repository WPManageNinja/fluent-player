import * as echarts from 'echarts/core';
import { PieChart, LineChart, MapChart } from 'echarts/charts';
import {
    TooltipComponent,
    LegendComponent,
    GridComponent,
    VisualMapComponent,
    GraphicComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
    PieChart,
    LineChart,
    MapChart,
    TooltipComponent,
    LegendComponent,
    GridComponent,
    VisualMapComponent,
    GraphicComponent,
    CanvasRenderer,
]);

export default echarts;

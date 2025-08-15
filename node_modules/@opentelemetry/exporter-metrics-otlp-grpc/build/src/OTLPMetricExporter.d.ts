import { OTLPMetricExporterBase, OTLPMetricExporterOptions } from '@opentelemetry/exporter-metrics-otlp-http';
import { ResourceMetrics } from '@opentelemetry/sdk-metrics';
import { OTLPGRPCExporterConfigNode, OTLPGRPCExporterNodeBase } from '@opentelemetry/otlp-grpc-exporter-base';
import { IExportMetricsServiceResponse } from '@opentelemetry/otlp-transformer';
declare class OTLPMetricExporterProxy extends OTLPGRPCExporterNodeBase<ResourceMetrics, IExportMetricsServiceResponse> {
    constructor(config?: OTLPGRPCExporterConfigNode & OTLPMetricExporterOptions);
    getDefaultUrl(config: OTLPGRPCExporterConfigNode): string;
    getUrlFromConfig(config: OTLPGRPCExporterConfigNode): string;
}
/**
 * OTLP-gRPC metric exporter
 */
export declare class OTLPMetricExporter extends OTLPMetricExporterBase<OTLPMetricExporterProxy> {
    constructor(config?: OTLPGRPCExporterConfigNode & OTLPMetricExporterOptions);
}
export {};
//# sourceMappingURL=OTLPMetricExporter.d.ts.map
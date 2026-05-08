import { Module, Global } from '@nestjs/common';
import { AI_PROVIDER_TOKEN } from './ai-provider.interface';
import { OllamaProvider } from './ollama.provider';

@Global()
@Module({
  providers: [
    {
      provide: AI_PROVIDER_TOKEN,
      useClass: OllamaProvider,
    },
  ],
  exports: [AI_PROVIDER_TOKEN],
})
export class AiModule {}

import { Module, Global } from '@nestjs/common';
import { AI_PROVIDER_TOKEN } from './ai-provider.interface';
import { OpenAIProvider } from './openai.provider';

@Global()
@Module({
  providers: [
    {
      provide: AI_PROVIDER_TOKEN,
      useClass: OpenAIProvider,
    },
  ],
  exports: [AI_PROVIDER_TOKEN],
})
export class AiModule {}

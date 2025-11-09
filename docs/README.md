# Next.js AI Chatbot Documentation

Comprehensive documentation for development, deployment, and operations.

## 📚 Quick Start

### For Developers
```bash
git clone https://github.com/nicxkms/nextjs-ai-chatbot.git
cd nextjs-ai-chatbot
pnpm install
cp .env.example .env.local
pnpm dev
```

### For DevOps
- [Deployment](./deployment.md) - Production setup and monitoring
- [Performance](./performance.md) - Optimizations and metrics
- [API](./api.md) - Complete API reference

## 📖 Documentation

### Core Guides
- **[Development](./development.md)** - Local setup, coding standards, testing
- **[Deployment](./deployment.md)** - Production deployment, monitoring, security
- **[API](./api.md)** - Complete API documentation with examples
- **[Performance](./performance.md)** - Current optimizations and metrics

### Architecture
- **[System Architecture](./system-architecture.md)** - Core design and data flow

### Technical Details
- **[Database Schema](./database-schema.md)** - Database structure and indexes
- **[Redis Cache](./redis-cache-keymap.md)** - Cache structure and patterns
- **[Chat Flows](./chat-flow-auth.md)** - Authenticated user data flow
- **[Guest Flow](./chat-flow-guest.md)** - Guest user data flow

## 🚀 Key Features

### Performance Optimizations
- **50-85% reduction** in Redis operations
- **30-40% faster** page load times
- **Non-blocking streaming** with zero added latency
- **Optimized bundle sizes** with modern formats

### Architecture Highlights
- **Dual User Support**: Regular (persistent) + Guest (temporary)
- **Real-time Streaming**: Server-sent events for instant responses
- **Multimodal Input**: Text, files, images, code blocks
- **Advanced Caching**: Redis-first with intelligent warming
- **Type Safety**: Full TypeScript with strict mode

### Technology Stack
- **Framework**: Next.js 16 with App Router
- **Database**: PostgreSQL with Drizzle ORM
- **Cache**: Upstash Redis
- **AI**: Multiple providers via AI SDK
- **UI**: shadcn/ui with Tailwind CSS
- **Deployment**: Vercel Fluid Compute

## 📊 Performance Metrics

| Metric | Before | After | Improvement |
|--------|---------|--------|-------------|
| **TTFB** | ~800ms | ~560ms | **-30%** |
| **LCP** | ~2.1s | ~1.5s | **-29%** |
| **TTI** | ~3.2s | ~2.0s | **-38%** |
| **Redis Ops** | baseline | +45% faster | **+45%** |

## 🏗️ Architecture Overview

```
User → Next.js App → API Routes → Data Layer → Cache/DB → AI Providers
```

### Key Patterns
- **Cache-First**: Redis checked before database queries
- **Unified Layer**: Single API for guest/auth users
- **Non-Blocking**: Streaming never waits for persistence
- **Type-Safe**: Full TypeScript coverage

## 🔧 Development Workflow

### Code Standards
- **TypeScript**: Strict mode with comprehensive coverage
- **Testing**: Jest + Playwright for full coverage
- **Git**: Conventional commits with pre-commit hooks
- **Linting**: ESLint with custom rules

### Testing Strategy
```bash
pnpm test          # Unit tests
pnpm test:e2e      # End-to-end tests
pnpm test:coverage # Coverage report
```

## 🚀 Deployment Strategy

### Production Environment
- **Platform**: Vercel (recommended)
- **Compute**: Vercel Fluid Compute
- **Database**: Neon PostgreSQL
- **Cache**: Upstash Redis
- **Monitoring**: OpenTelemetry + Vercel Analytics

### Scaling Considerations
- **Database**: Connection pooling for serverless
- **Cache**: Pipeline operations and intelligent warming
- **API**: Rate limiting and quota management
- **Assets**: Modern image formats and CDN optimization

## 🤝 Contributing

### How to Contribute
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Follow the [development guide](./development.md)
4. Add tests for new functionality
5. Submit a pull request

### Development Guidelines
- Follow TypeScript strict mode
- Implement comprehensive error handling
- Add performance monitoring
- Write tests for all new features

## 📞 Support

### Getting Help
- **Documentation**: Start with the relevant guide above
- **Issues**: Open an issue on GitHub for bugs
- **Discussions**: Use GitHub Discussions for questions

### Reporting Issues
Include:
- Environment details (OS, browser, version)
- Steps to reproduce
- Expected vs actual behavior
- Error logs or screenshots

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

---

*Last Updated: November 8, 2025*  
*Version: 2.0 - Streamlined Documentation*

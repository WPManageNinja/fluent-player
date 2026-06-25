<template>
    <div class="pro-upgrade-wrapper">
        <div class="pro-upgrade-content">
            <div class="pro-icon">
                <component :is="iconComponent" v-if="iconComponent" />
            </div>

            <h2 class="pro-title">{{ $t(title) }}</h2>

            <p class="pro-description">
                {{ $t(description) }}
            </p>

            <ul class="pro-features" v-if="features && features.length">
                <li v-for="(feature, index) in features" :key="index">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                            d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                    {{ $t(feature) }}
                </li>
            </ul>

            <div class="pro-actions">
                <a :href="upgradeUrl" target="_blank" rel="noopener noreferrer" class="pro-upgrade-btn">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
                        <path
                            d="M12 2L15.09 8.26L22 9L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9L8.91 8.26L12 2Z"
                            fill="currentColor" />
                    </svg>
                    {{ $t(upgradeButtonText) }}
                </a>
            </div>

            <div class="pro-guarantee" v-if="showGuarantee">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                        d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
                {{ $t(guaranteeText) }}
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: "ProUpgrade",
    props: {
        // Main content
        title: {
            type: String,
            default: "This is a Pro Feature"
        },
        description: {
            type: String,
            default: "Unlock advanced features and capabilities with FluentPlayer Pro."
        },
        features: {
            type: Array,
            default: () => []
        },

        // Icon
        iconComponent: {
            type: [String, Object],
            default: null
        },

        // Actions
        upgradeUrl: {
            type: String,
            default: "https://fluentplayer.com/"
        },
        upgradeButtonText: {
            type: String,
            default: "Upgrade to Pro"
        },
        showDemo: {
            type: Boolean,
            default: true
        },
        demoUrl: {
            type: String,
            default: "https://fluentplayer.com/demo/"
        },
        demoButtonText: {
            type: String,
            default: "View Demo"
        },

        // Guarantee
        showGuarantee: {
            type: Boolean,
            default: false
        },
        guaranteeText: {
            type: String,
            default: "Coming Soon!"
        }
    }
};
</script>

<style scoped lang="scss">
.pro-upgrade-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 40px 20px;
}

.pro-upgrade-content {
    max-width: 600px;
    text-align: center;
    background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
    color: white;
    padding: 30px;
    border-radius: 16px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
}

.pro-icon {
    color: rgba(255, 255, 255, 0.9);
    margin-bottom: 24px;

    svg {
        filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
    }
}

.pro-title {
    color: white;
    font-size: 24px;
    font-weight: 700;
    margin-bottom: 16px;
}

.pro-description {
    font-size: 18px;
    margin-bottom: 32px;
    opacity: 0.9;
    line-height: 1.6;
}

.pro-features {
    list-style: none;
    padding: 0;
    margin: 0 0 40px 0;
    text-align: left;
    display: inline-block;

    li {
        display: flex;
        align-items: center;
        margin-bottom: 12px;
        font-size: 16px;

        svg {
            margin-right: 12px;
            color: rgba(255, 255, 255, 0.9);
            flex-shrink: 0;
        }
    }
}

.pro-actions {
    display: flex;
    gap: 16px;
    justify-content: center;
    margin-bottom: 24px;
    flex-wrap: wrap;
}

.pro-upgrade-btn {
    background: rgba(255, 255, 255, 0.2);
    color: white;
    padding: 16px 32px;
    text-decoration: none;
    border-radius: 8px;
    font-weight: 600;
    font-size: 16px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    transition: all 0.3s ease;
    border: 2px solid rgba(255, 255, 255, 0.3);
    backdrop-filter: blur(10px);

    &:hover {
        background: rgba(255, 255, 255, 0.3);
        transform: translateY(-2px);
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
        color: white;
        text-decoration: none;
    }
}

.pro-demo-btn {
    background: transparent;
    color: rgba(255, 255, 255, 0.9);
    padding: 16px 32px;
    text-decoration: none;
    border-radius: 8px;
    font-weight: 500;
    font-size: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    transition: all 0.3s ease;

    &:hover {
        background: rgba(255, 255, 255, 0.1);
        color: white;
        text-decoration: none;
    }
}

.pro-guarantee {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: 14px;
    opacity: 0.8;

    svg {
        color: rgba(255, 255, 255, 0.8);
    }
}

@media (max-width: 768px) {
    .pro-upgrade-content {
        padding: 40px 24px;
        margin: 20px;
    }

    h2 {
        font-size: 24px;
    }

    .pro-description {
        font-size: 16px;
    }

    .pro-actions {
        flex-direction: column;
        align-items: center;
    }

    .pro-upgrade-btn,
    .pro-demo-btn {
        width: 100%;
        max-width: 280px;
        justify-content: center;
    }
}
</style>

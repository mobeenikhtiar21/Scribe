import { Box, Button, Flex, FlexItem, Tabs } from '@bigcommerce/big-design';
import type { ActionView } from '../types';

interface ActionBarProps {
  activeView: ActionView;
  onViewChange: (view: ActionView) => void;
  orderId: string;
  isDraft?: boolean;
}

const tabs = [
  { id: 'print' as const, title: 'Print' },
  { id: 'send' as const, title: 'Send' },
  { id: 'message' as const, title: 'Message' },
  { id: 'notes' as const, title: 'Notes' },
];

export function ActionBar({ activeView, onViewChange, orderId, isDraft }: ActionBarProps) {
  return (
    <Box marginBottom="medium">
      <Flex justifyContent="space-between" alignItems="flex-end">
        <FlexItem flexGrow={1}>
          <Tabs
            activeTab={activeView}
            items={tabs}
            onTabClick={(tabId) => onViewChange(tabId as ActionView)}
          />
        </FlexItem>
        {!isDraft && (
          <FlexItem>
            <Button
              variant="subtle"
              onClick={() => {
                window.open(`/manage/orders/${orderId}/edit`, '_blank');
              }}
            >
              Edit Order
            </Button>
          </FlexItem>
        )}
      </Flex>
    </Box>
  );
}

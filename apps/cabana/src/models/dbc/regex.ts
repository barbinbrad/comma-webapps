export const DBC_COMMENT_RE = /^CM_ *"(.*)";/;
export const DBC_COMMENT_MULTI_LINE_RE = /^CM_ *"(.*)/;

export const MSG_RE = /^BO_ (\w+) (\w+) *: (\w+) (\w+)/;

export const SIGNAL_RE =
  /^SG_ (\w+) : (\d+)\|(\d+)@(\d+)([+|-]) \(([0-9.+-eE]+),([0-9.+-eE]+)\) \[([0-9.+-eE]+)\|([0-9.+-eE]+)\] "(.*)" (.*)/;
// Multiplexed signal
export const MP_SIGNAL_RE =
  /^SG_ (\w+) (\w+) *: (\d+)\|(\d+)@(\d+)([+|-]) \(([0-9.+-eE]+),([0-9.+-eE]+)\) \[([0-9.+-eE]+)\|([0-9.+-eE]+)\] "(.*)" (.*)/;

export const VAL_RE = /^VAL_ (\w+) (\w+) (.*);/;
export const VAL_TABLE_RE = /^VAL_TABLE_ (\w+) (.*);/;

export const MSG_TRANSMITTER_RE = /^BO_TX_BU_ ([0-9]+) *: *(.+);/;

export const SIGNAL_COMMENT_RE = /^CM_ SG_ *(\w+) *(\w+) *"(.*)";/;
export const SIGNAL_COMMENT_MULTI_LINE_RE = /^CM_ SG_ *(\w+) *(\w+) *"(.*)/;

// Message Comments (CM_ BO_ )
export const MESSAGE_COMMENT_RE = /^CM_ BO_ *(\w+) *"(.*)";/;
export const MESSAGE_COMMENT_MULTI_LINE_RE = /^CM_ BO_ *(\w+) *"(.*)/;

export const BOARD_UNIT_RE = /^BU_:(.*)/;
export const BOARD_UNIT_COMMENT_RE = /^CM_ BU_ *(\w+) *"(.*)";/;
export const BOARD_UNIT_COMMENT_MULTI_LINE_RE = /^CM_ BU_ *(\w+) *"(.*)/;

// Follow ups are used to parse multi-line comment definitions
export const FOLLOW_UP_DBC_COMMENT = 'FollowUpDbcComment';
export const FOLLOW_UP_SIGNAL_COMMENT = 'FollowUpSignalComment';
export const FOLLOW_UP_MSG_COMMENT = 'FollowUpMsgComment';
export const FOLLOW_UP_BOARD_UNIT_COMMENT = 'FollowUpBoardUnitComment';

#!/bin/bash
which sed >> /dev/null || exit 1

version=1.0b
editor="Norman Geist"
last="04 Jul 2016"

# NOTE: Brilliant pipeable tool to format input text into a table by 
# NOTE: an configurable seperation string, similar to column
# NOTE: from util-linux, but we are smart enough to ignore 
# NOTE: ANSI escape codes in our column width computation
# NOTE: means we handle colors properly ;-)

# BUG : none

addspace=1
seperator=$(echo -e " ")
columnW=()
columnT=()

while getopts "s:hp:v" opt; do
  case $opt in
s ) seperator=$OPTARG;;
p ) addspace=$OPTARG;;
v ) echo "Version $version last edited by $editor ($last)"; exit 0;;
h ) echo "column2 [-s seperator] [-p padding] [-v]"; exit 0;;
* ) echo "Unknow comandline switch \"$opt\""; exit 1
  esac
done
shift $(($OPTIND-1))

if [ ${#seperator} -lt 1 ]; then
  echo "Error) Please enter valid seperation string!"
  exit 1
fi

if [ ${#addspace} -lt 1 ]; then
  echo "Error) Please enter number of addional padding spaces!"
  exit 1
fi

#args: string
function trimANSI()
{
  TRIM=$1
  TRIM=$(sed 's/\x1b\[[0-9;]*m//g' <<< $TRIM); #trim color codes
  TRIM=$(sed 's/\x1b(B//g'         <<< $TRIM); #trim sgr0 directive
  echo $TRIM
}

#args: len
function pad()
{
  for ((i=0; i<$1; i++))
  do 
echo -n " "
  done
}

#read and measure cols
while read ROW
do
  while IFS=$seperator read -ra COLS; do
ITEMC=0
for ITEM in "${COLS[@]}"; do
  SITEM=$(trimANSI "$ITEM"); #quotes matter O_o
  [ ${#columnW[$ITEMC]} -gt 0 ] || columnW[$ITEMC]=0
  [ ${columnW[$ITEMC]} -lt ${#SITEM} ] && columnW[$ITEMC]=${#SITEM}
  ((ITEMC++))
done
columnT[${#columnT[@]}]="$ROW"
  done <<< "$ROW"
done

#print formatted output
for ROW in "${columnT[@]}"
do
  while IFS=$seperator read -ra COLS; do
ITEMC=0
for ITEM in "${COLS[@]}"; do
  WIDTH=$(( ${columnW[$ITEMC]} + $addspace ))
  SITEM=$(trimANSI "$ITEM"); #quotes matter O_o
  PAD=$(($WIDTH-${#SITEM}))

  if [ $ITEMC -ne 0 ]; then
    pad $PAD
  fi

  echo -n "$ITEM"

  if [ $ITEMC -eq 0 ]; then
    pad $PAD
  fi

  ((ITEMC++))
done
  done <<< "$ROW"
  echo ""
done